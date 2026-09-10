import { ToastContainer } from "react-toastify";
import { useTheme } from "../../theme/useTheme";

export function AppToastContainer() {
  const { theme } = useTheme();
  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      closeOnClick
      pauseOnHover
      draggable
      theme={theme}
    />
  );
}
