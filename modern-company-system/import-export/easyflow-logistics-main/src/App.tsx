import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import React, { Suspense } from "react"; // 👈 تم إضافة React و Suspense هنا
import axios from 'axios';
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import Suppliers from "./pages/Suppliers";
import SupplierDetails from "./pages/SupplierDetails";
import Products from "./pages/Products";
import Containers from "./pages/Containers";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import Financials from "./pages/Financials";
import Banks from "./pages/Banks";
import ArchivePage from "./pages/Archive";
import ShippingAgents from "./pages/ShippingAgents";
import ShippingAgentDetails from "./pages/ShippingAgentDetails";
import Employees from "./pages/Employees";
import PackingLists from "./pages/PackingLists";
import Commissions from "./pages/Commissions";
import Operations from "./pages/Operations";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return <AppLayout>{children}</AppLayout>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        {/* 🚀 تغليف الـ Routes بـ Suspense لحماية نظام الترجمة i18n من عمل Crash للفرونت إند */}
        <Suspense fallback={
          <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#666' }}>
            Loading System...
          </div>
        }>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<LayoutWrapper><Dashboard /></LayoutWrapper>} />
            <Route path="/jobs" element={<LayoutWrapper><Jobs /></LayoutWrapper>} />
            <Route path="/jobs/:id" element={<LayoutWrapper><JobDetails /></LayoutWrapper>} />
            <Route path="/clients" element={<LayoutWrapper><Clients /></LayoutWrapper>} />
            <Route path="/clients/:id" element={<LayoutWrapper><ClientDetails /></LayoutWrapper>} />
            <Route path="/suppliers" element={<LayoutWrapper><Suppliers /></LayoutWrapper>} />
            <Route path="/suppliers/:id" element={<LayoutWrapper><SupplierDetails /></LayoutWrapper>} />
            <Route path="/products" element={<LayoutWrapper><Products /></LayoutWrapper>} />
            <Route path="/containers" element={<LayoutWrapper><Containers /></LayoutWrapper>} />
            <Route path="/financials" element={<LayoutWrapper><Financials /></LayoutWrapper>} />
            <Route path="/banks" element={<LayoutWrapper><Banks /></LayoutWrapper>} />
            <Route path="/shipping-agents" element={<LayoutWrapper><ShippingAgents /></LayoutWrapper>} />
            <Route path="/shipping-agents/:id" element={<LayoutWrapper><ShippingAgentDetails /></LayoutWrapper>} />
            <Route path="/employees" element={<LayoutWrapper><Employees /></LayoutWrapper>} />
            <Route path="/packing-lists" element={<LayoutWrapper><PackingLists /></LayoutWrapper>} />
            <Route path="/commissions" element={<LayoutWrapper><Commissions /></LayoutWrapper>} />
            <Route path="/operations" element={<LayoutWrapper><Operations /></LayoutWrapper>} />
            <Route path="/archive" element={<LayoutWrapper><ArchivePage /></LayoutWrapper>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;