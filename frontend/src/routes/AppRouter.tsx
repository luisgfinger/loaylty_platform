import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { LoadingState } from "../components/feedback/LoadingState";
import { AppLayout } from "../components/layout/AppLayout";
import { LoginPage } from "../pages/auth/LoginPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { CustomersPage } from "../pages/customers/CustomersPage";
import { EmployeesPage } from "../pages/employees/EmployeesPage";
import { CompanyPage } from "../pages/company/CompanyPage";
import { LoyaltyPage } from "../pages/loyalty/LoyaltyPage";
import { RewardsPage } from "../pages/rewards/RewardsPage";
import {
  PurchaseHistoryPage,
  PurchaseRegistrationPage,
} from "../pages/purchases/PurchasesPage";

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(
    new PopStateEvent("popstate")
  );
}

export function AppRouter() {
  const {
    session,
    isLoading,
  } = useAuth();

  const [
    path,
    setPath,
  ] = useState(
    window.location.pathname
  );


  // ===================================================
  // ACOMPANHAR ALTERAÇÕES DA URL
  // ===================================================

  useEffect(() => {
    const listener =
      () =>
        setPath(
          window.location.pathname
        );

    window.addEventListener(
      "popstate",
      listener
    );

    return () =>
      window.removeEventListener(
        "popstate",
        listener
      );
  }, []);


  // ===================================================
  // REDIRECIONAMENTO DE LOGIN
  // ===================================================

  useEffect(() => {
    if (
      !isLoading &&
      !session &&
      path !== "/login"
    ) {
      navigate("/login");
    }

    if (
      !isLoading &&
      session &&
      path === "/login"
    ) {
      navigate(
        "/app/purchases/new"
      );
    }
  }, [
    isLoading,
    path,
    session,
  ]);


  // ===================================================
  // CAIXA SOMENTE PODE ACESSAR REGISTRO DE COMPRAS
  // ===================================================

  useEffect(() => {
    if (
      !isLoading &&
      session?.employee.role ===
        "CAIXA" &&
      path !==
        "/app/purchases/new"
    ) {
      navigate(
        "/app/purchases/new"
      );
    }
  }, [
    isLoading,
    path,
    session,
  ]);


  // ===================================================
  // CARREGANDO SESSÃO
  // ===================================================

  if (
    isLoading
  ) {
    return (
      <LoadingState
        label="Verificando sua sessão…"
        fullPage
      />
    );
  }


  // ===================================================
  // SEM SESSÃO
  // ===================================================

  if (
    !session
  ) {
    return (
      <LoginPage />
    );
  }


  // ===================================================
  // ROTAS AUTENTICADAS
  // ===================================================

  return (
    <AppLayout
      currentPath={path}
      onNavigate={navigate}
    >
      {path ===
      "/app/customers" ? (
        <CustomersPage />
      ) : path ===
        "/app/employees" ? (
        <EmployeesPage />
      ) : path ===
        "/app/company" ? (
        <CompanyPage />
      ) : path ===
        "/app/loyalty" ? (
        <LoyaltyPage />
      ) : path ===
        "/app/rewards" ? (
        <RewardsPage />
      ) : path ===
        "/app/purchases/new" ? (
        <PurchaseRegistrationPage />
      ) : path ===
        "/app/purchases" ? (
        <PurchaseHistoryPage />
      ) : (
        <DashboardPage />
      )}
    </AppLayout>
  );
}