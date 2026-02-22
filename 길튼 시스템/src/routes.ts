import { createBrowserRouter } from "react-router";
import Root from "./components/Root";
import Home from "./pages/Home";
import WorshipList from "./pages/WorshipList";
import WorshipEdit from "./pages/WorshipEdit";
import Worship from "./pages/Worship";
import ProfileSetup from "./pages/ProfileSetup";
import ProfileEdit from "./pages/ProfileEdit";
import CommandSetup from "./pages/CommandSetup";
import WorshipTypeSettings from "./pages/WorshipTypeSettings";
import RoleManagement from "./pages/RoleManagement";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "worship-list", Component: WorshipList },
      { path: "worship-edit/:id", Component: WorshipEdit },
      { path: "worship/:id", Component: Worship },
      { path: "profile-setup", Component: ProfileSetup },
      { path: "profile-setup/:id", Component: ProfileEdit },
      { path: "role-management", Component: RoleManagement },
      { path: "command-setup", Component: CommandSetup },
      { path: "worship-type-settings", Component: WorshipTypeSettings },
    ],
  },
]);