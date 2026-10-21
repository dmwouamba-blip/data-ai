import { useState, useEffect } from 'react'
import { api } from '../services/api'

export interface Order {
  id: string
  instrument: string
  side: 'BUY' | 'SELL'
  quantity: number
  entryPrice: number
  currentPrice: number
  unrealizedPnL: number
  timestamp: string
  status: 'OPEN' | 'CLOSED'
}

interface OrderSimulatorProps {
  onOrderUpdate?: (orders: Order[]) => void
}

export default function OrderSimulator({ onOrderUpdate }: OrderSimulatorProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [realizedPnL, setRealizedPnL] = useState(0)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderForm, setOrderForm] = useState({
    instrument: 'Brent ICE',
    side: 'BUY' as 'BUY' | 'SELL',
    quantity: 1000,
    price: 85.50
  })

  // Simuler les prix en temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders(prevOrders => 
        prevOrders.map(order => {
          // Simuler une variation de prix aléatoire
          const priceChange = (Math.random() - 0.5) * 0.001
          const newPrice = Math.max(0.001, order.currentPrice + priceChange)
          const priceDiff = newPrice - order.entryPrice
          const unrealizedPnL = order.side === 'BUY' 
            ? priceDiff * order.quantity 
            : -priceDiff * order.quantity

          return {
            ...order,
            currentPrice: newPrice,
            unrealizedPnL: Math.round(unrealizedPnL * 100) / 100
          }
        })
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Notifier les changements d'ordres
  useEffect(() => {
    onOrderUpdate?.(orders)
  }, [orders, onOrderUpdate])

  const handlePlaceOrder = () => {
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      instrument: orderForm.instrument,
      side: orderForm.side,
      quantity: orderForm.quantity,
      entryPrice: orderForm.price,
      currentPrice: orderForm.price,
      unrealizedPnL: 0,
      timestamp: new Date().toISOString(),
      status: 'OPEN'
    }

    setOrders(prev => [...prev, newOrder])
    setShowOrderForm(false)
  }

  const handleCloseOrder = (orderId: string) => {
    setOrders(prev => {
      const orderToClose = prev.find(o => o.id === orderId)
      if (orderToClose) {
        setRealizedPnL(prevPnL => prevPnL + orderToClose.unrealizedPnL)
      }
      return prev.filter(o => o.id !== orderId)
    })
  }

  const totalUnrealizedPnL = orders.reduce((sum, order) => sum + order.unrealizedPnL, 0)
  const globalPnL = realizedPnL + totalUnrealizedPnL

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'var(--success)'
    if (pnl < 0) return 'var(--danger)'
    return 'var(--muted)'
  }

  const getPnLClass = (pnl: number) => {
    if (pnl > 0) return 'pnl-positive'
    if (pnl < 0) return 'pnl-negative'
    return 'pnl-neutral'
  }

  return (
    <div className="order-simulator">
      <div className="simulator-header">
        <h3>Trading Simulator</h3>
        <button 
          className="button primary"
          onClick={() => setShowOrderForm(!showOrderForm)}
        >
          Place Order
        </button>
      </div>

      {showOrderForm && (
        <div className="order-form card">
          <h4>New Order</h4>
          <div className="form-grid">
            <div>
              <label>Instrument</label>
              <select 
                value={orderForm.instrument}
                onChange={e => setOrderForm(prev => ({ ...prev, instrument: e.target.value }))}
              >
                <option value="EURUSD">EUR/USD</option>
                <option value="GBPUSD">GBP/USD</option>
                <option value="USDJPY">USD/JPY</option>
                <option value="GOLD">Gold</option>
                <option value="OIL">Crude Oil</option>
              </select>
            </div>
            <div>
              <label>Direction</label>
              <select 
                value={orderForm.side}
                onChange={e => setOrderForm(prev => ({ ...prev, side: e.target.value as 'BUY' | 'SELL' }))}
              >
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </div>
            <div>
              <label>Quantity</label>
              <input 
                type="number"
                value={orderForm.quantity}
                onChange={e => setOrderForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label>Price</label>
              <input 
                type="number"
                step="0.0001"
                value={orderForm.price}
                onChange={e => setOrderForm(prev => ({ ...prev, price: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="button" onClick={() => setShowOrderForm(false)}>
              Cancel
            </button>
            <button className="button primary" onClick={handlePlaceOrder}>
              Confirm Order
            </button>
          </div>
        </div>
      )}

      <div className="pnl-summary card">
        <div className="pnl-grid">
          <div className="pnl-item">
            <div className="pnl-label">Realized P&L</div>
            <div className={`pnl-value ${getPnLClass(realizedPnL)}`}>
              {realizedPnL >= 0 ? '+' : ''}{realizedPnL.toFixed(2)} USD
            </div>
          </div>
          <div className="pnl-item">
            <div className="pnl-label">Unrealized P&L</div>
            <div className={`pnl-value ${getPnLClass(totalUnrealizedPnL)}`}>
              {totalUnrealizedPnL >= 0 ? '+' : ''}{totalUnrealizedPnL.toFixed(2)} USD
            </div>
          </div>
          <div className="pnl-item global">
            <div className="pnl-label">Total P&L</div>
            <div className={`pnl-value global ${getPnLClass(globalPnL)}`}>
              {globalPnL >= 0 ? '+' : ''}{globalPnL.toFixed(2)} USD
            </div>
          </div>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="open-orders card">
          <h4>Open Orders ({orders.length})</h4>
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.id} className={`order-item ${getPnLClass(order.unrealizedPnL)}`}>
                <div className="order-header">
                  <div className="order-info">
                    <span className="instrument">{order.instrument}</span>
                    <span className={`side ${order.side.toLowerCase()}`}>{order.side}</span>
                    <span className="quantity">{order.quantity.toLocaleString()}</span>
                  </div>
                  <button 
                    className="button small danger"
                    onClick={() => handleCloseOrder(order.id)}
                  >
                    Close
                  </button>
                </div>
                <div className="order-details">
                  <div className="price-info">
                    <span>Entry Price: {order.entryPrice.toFixed(4)}</span>
                    <span>Current Price: {order.currentPrice.toFixed(4)}</span>
                  </div>
                  <div className={`unrealized-pnl ${getPnLClass(order.unrealizedPnL)}`}>
                    {order.unrealizedPnL >= 0 ? '+' : ''}{order.unrealizedPnL.toFixed(2)} USD
                  </div>
                </div>
                <div className="order-timestamp">
                  {new Date(order.timestamp).toLocaleString('en-US')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
