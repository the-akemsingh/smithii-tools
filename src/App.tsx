import './App.css'
import Navbar from './components/Navbar'
import LaunchTokenPage from './pages/LaunchTokenPage'
import SendTokensPage from './pages/SendTokensPage'
import WalletTokensPage from './pages/WalletTokensPage'
import SendSolana from './SendSolana'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'

function AppLayout() {
  return (
    <div className="flex cal-sans min-h-screen ">
      <Navbar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  const router = createBrowserRouter([
    {
      element: <AppLayout />,
      children: [
        {
          index: true,
          element: <SendSolana />,
        },
        {
          path: 'launch-token',
          element: <LaunchTokenPage />,
        },
        {
          path: 'send-tokens',
          element: <SendTokensPage />,
        },
        {
          path: 'wallet-tokens',
          element: <WalletTokensPage />,
        },
      ],
    },
  ])

  return (
    <div className="min-h-screen">
      <RouterProvider router={router} />
    </div>
  )
}

export default App
