import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { Header } from "../components/layout/Header";

export const MainLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-layout">
        <Header />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
