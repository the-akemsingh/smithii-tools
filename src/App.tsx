import AirDrop from './AirDrop'
import './App.css'
import Navbar from './components/Navbar'
import LaunchToken from './LaunchToken'
import SendSolana from './SendSolana'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-linear-to-b from-slate-900 via-slate-950 to-black">
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
          path: 'airdrop',
          element: <AirDrop />,
        },
        {
          path: 'launch-token',
          element: <LaunchToken />,
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
