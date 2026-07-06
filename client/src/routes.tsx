import { createBrowserRouter, useParams } from "react-router";
import App from "./App";
import Home from "./pages/Home";
import WorshipList from "./pages/WorshipList";
import WorshipEdit from "./pages/WorshipEdit";
import Worship from "./pages/Worship";
import ProfileSetup from "./pages/ProfileSetup";
import ProfileEdit from "./pages/ProfileEdit";
import RoleManagement from "./pages/RoleManagement";
import CommandSetup from "./pages/CommandSetup";
import WorshipTypeSettings from "./pages/WorshipTypeSettings";

// :id가 바뀌면 폼을 리마운트해 이전 리소스의 dirty 값이 keepDirtyValues로 이월되는 것을 차단
function KeyedWorshipEdit() {
  const { id } = useParams();
  return <WorshipEdit key={id} />;
}

function KeyedProfileEdit() {
  const { id } = useParams();
  return <ProfileEdit key={id} />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "worship-list", element: <WorshipList /> },
      { path: "worship-edit/:id", element: <KeyedWorshipEdit /> },
      { path: "worship/:id", element: <Worship /> },
      { path: "profile-setup", element: <ProfileSetup /> },
      { path: "profile-setup/:id", element: <KeyedProfileEdit /> },
      { path: "role-management", element: <RoleManagement /> },
      { path: "command-setup", element: <CommandSetup /> },
      { path: "worship-type-settings", element: <WorshipTypeSettings /> },
    ],
  },
]);
