import React from "react";
import { Outlet } from "react-router-dom";
import { CustomerSidebar } from "../components/layout/CustomerSidebar";
import { Header } from "../components/layout/Header";

export const CustomerLayout = () => {
  return (
    <div className="app-container">
      <CustomerSidebar />
      <div className="main-layout">
        <Header />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
