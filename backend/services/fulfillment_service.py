from sqlalchemy.orm import Session
from models import Order, Quotation, QuoteLine, Fulfillment, Backorder, Inventory, Warehouse

def fulfill_order(db: Session, order: Order, manual_allocations: list = None) -> dict:
    """
    Allocates available stock to fulfill an approved order.
    Creates Fulfillment and Backorder records.
    Supports idempotency (skips re-allocation if already fulfilled).
    Supports manual allocation override:
        manual_allocations = [{"product_id": int, "warehouse_id": int, "quantity": int}, ...]
    """
    if not order.quotation or order.quotation.status != "approved":
        raise ValueError(f"Cannot fulfill order {order.order_number}: Quotation is not approved.")

    total_fulfilled = 0
    shipment_count = 0
    estimated_shipping_cost = 0.0
    warehouses_used = set()

    # Determine required quantities from quotation lines
    requirements = {}
    for line in order.quotation.lines:
        if line.product_id:
            requirements[line.product_id] = requirements.get(line.product_id, 0) + line.quantity

    # Determine already fulfilled/backordered quantities to handle idempotency
    already_processed = {}
    existing_fulfillments = db.query(Fulfillment).filter_by(order_id=order.id).all()
    existing_backorders = db.query(Backorder).filter_by(order_id=order.id).all()
    
    for f in existing_fulfillments:
        already_processed[f.product_id] = already_processed.get(f.product_id, 0) + f.quantity
    for b in existing_backorders:
        already_processed[b.product_id] = already_processed.get(b.product_id, 0) + b.remaining_quantity

    needs_allocation = False
    for pid, required_qty in requirements.items():
        if already_processed.get(pid, 0) < required_qty:
            needs_allocation = True
            break
            
    # If a manual allocation is forced, we clear and reallocate.
    if not needs_allocation and not manual_allocations:
        # Already fully allocated. Just return stats.
        for f in existing_fulfillments:
            warehouses_used.add(f.warehouse_id)
            total_fulfilled += f.quantity
            
        return {
            "total_fulfilled_quantity": total_fulfilled,
            "shipment_count": len(warehouses_used),
            "estimated_shipping_cost": estimated_shipping_cost
        }
        
    # Clear existing allocations to avoid double-allocation
    for f in existing_fulfillments:
        # Release reservation
        inv = db.query(Inventory).filter_by(product_id=f.product_id, warehouse_id=f.warehouse_id).first()
        if inv:
            inv.reserved_quantity -= f.quantity
        db.delete(f)
    for b in existing_backorders:
        db.delete(b)
        
    db.flush()

    # Proceed with allocation
    for pid, required_qty in requirements.items():
        remaining_to_fulfill = required_qty
        
        # Manual allocation override
        if manual_allocations:
            pid_allocs = [m for m in manual_allocations if m.get("product_id") == pid]
            for m in pid_allocs:
                wid = m["warehouse_id"]
                qty = m["quantity"]
                
                # Check actual inventory
                inv = db.query(Inventory).join(Warehouse).filter(
                    Inventory.product_id == pid,
                    Inventory.warehouse_id == wid,
                    Warehouse.is_active == True
                ).first()
                
                if not inv:
                    raise ValueError(f"Warehouse {wid} does not have active inventory for product {pid}.")
                
                available = inv.quantity - inv.reserved_quantity
                if qty > available:
                    raise ValueError(f"Manual override requests {qty} for product {pid} in warehouse {wid}, but only {available} available.")
                    
                # Allocate
                f = Fulfillment(order_id=order.id, product_id=pid, warehouse_id=wid, quantity=qty)
                db.add(f)
                inv.reserved_quantity += qty
                remaining_to_fulfill -= qty
                total_fulfilled += qty
                warehouses_used.add(wid)
        else:
            # Automatic Allocation
            # Get active inventories for this product
            inventories = db.query(Inventory).join(Warehouse).filter(
                Inventory.product_id == pid,
                Warehouse.is_active == True
            ).all()
            
            # Sort by available quantity descending (minimizes shipments by taking largest chunks first)
            inventories.sort(key=lambda i: i.quantity - i.reserved_quantity, reverse=True)
            
            for inv in inventories:
                if remaining_to_fulfill <= 0:
                    break
                    
                available = inv.quantity - inv.reserved_quantity
                if available <= 0:
                    continue
                    
                allocate_qty = min(available, remaining_to_fulfill)
                
                f = Fulfillment(order_id=order.id, product_id=pid, warehouse_id=inv.warehouse_id, quantity=allocate_qty)
                db.add(f)
                inv.reserved_quantity += allocate_qty
                remaining_to_fulfill -= allocate_qty
                total_fulfilled += allocate_qty
                warehouses_used.add(inv.warehouse_id)
                
        # Backorder unfulfilled remainder
        if remaining_to_fulfill > 0:
            b = Backorder(order_id=order.id, product_id=pid, remaining_quantity=remaining_to_fulfill)
            db.add(b)
            
    db.flush()
    # Expire the collections so they reload in the test session
    db.expire(order, ['fulfillments', 'backorders'])
    
    return {
        "total_fulfilled_quantity": total_fulfilled,
        "shipment_count": len(warehouses_used),
        "estimated_shipping_cost": estimated_shipping_cost
    }
