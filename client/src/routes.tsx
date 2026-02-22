import { createBrowserRouter } from 'react-router';
import App from './App';
import Home from './pages/Home';
import WorshipList from './pages/WorshipList';
import WorshipEdit from './pages/WorshipEdit';
import Worship from './pages/Worship';
import ProfileSetup from './pages/ProfileSetup';
import ProfileEdit from './pages/ProfileEdit';
import RoleManagement from './pages/RoleManagement';
import CommandSetup from './pages/CommandSetup';
import WorshipTypeSettings from './pages/WorshipTypeSettings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'worship-list', element: <WorshipList /> },
      { path: 'worship-edit/:id', element: <WorshipEdit /> },
      { path: 'worship/:id', element: <Worship /> },
      { path: 'profile-setup', element: <ProfileSetup /> },
      { path: 'profile-setup/:id', element: <ProfileEdit /> },
      { path: 'role-management', element: <RoleManagement /> },
      { path: 'command-setup', element: <CommandSetup /> },
      { path: 'worship-type-settings', element: <WorshipTypeSettings /> },
    ],
  },
]);
