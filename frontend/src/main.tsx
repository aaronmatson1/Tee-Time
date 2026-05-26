import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import App from "./App.tsx";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Groups from "./pages/Groups.tsx";
import Windows from "./pages/Windows.tsx";
import Matches from "./pages/Matches.tsx";
import AcceptInvite from "./pages/AcceptInvite.tsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="login" element={<Login />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="groups" element={<Groups />} />
          <Route path="windows" element={<Windows />} />
          <Route path="matches" element={<Matches />} />
          <Route path="invite/:token" element={<AcceptInvite />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
