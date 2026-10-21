import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './pages/App'
import Home from './pages/Home'
import Trading from './pages/Trading'
import Risk from './pages/Risk'
import Finance from './pages/Finance'
import Operations from './pages/Operations'
import Compliance from './pages/Compliance'
import './styles/global.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/trading', element: <Trading /> },
      { path: '/risk', element: <Risk /> },
      { path: '/finance', element: <Finance /> },
      { path: '/operations', element: <Operations /> },
      { path: '/compliance', element: <Compliance /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
