import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { AsyncNotification } from '../services/asyncChatService'

interface Props {
  notification: AsyncNotification | null
  isOpen: boolean
  onClose: () => void
}

export default function AsyncResponseModal({ notification, isOpen, onClose }: Props) {
  if (!isOpen || !notification) return null

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(0,0,0,0.5)', 
      zIndex: 70, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }} onClick={onClose}>
      <div 
        className="glass" 
        style={{ 
          width: 800, 
          maxWidth: 'calc(100% - 32px)', 
          maxHeight: '80vh', 
          margin: 16, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: 16, 
          borderBottom: '1px solid var(--border)', 
          flexShrink: 0 
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>
              ✅ Async Response Received
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {new Date(notification.timestamp).toLocaleString('fr-FR')}
            </div>
          </div>
          <button className="button" onClick={onClose}>✕ Close</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {/* Question originale */}
          <div style={{
            background: 'linear-gradient(135deg, #4b5563, #374151)',
            color: '#ffffff',
            padding: '16px 20px',
            borderRadius: 12,
            marginBottom: 16,
            alignSelf: 'flex-end'
          }}>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>Your question:</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{notification.question}</div>
          </div>

          {/* Réponse */}
          <div style={{
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              fontSize: 14, 
              color: 'var(--muted)', 
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 8,
                height: 8,
                background: '#10b981',
                borderRadius: '50%'
              }}></div>
              AI Assistant Response
            </div>
            
            <ReactMarkdown
              components={{
                h1: ({ children }: any) => <h1 style={{ fontSize: '1.5em', fontWeight: 'bold', margin: '0.5em 0', color: 'var(--text)' }}>{children}</h1>,
                h2: ({ children }: any) => <h2 style={{ fontSize: '1.3em', fontWeight: 'bold', margin: '0.4em 0', color: 'var(--text)' }}>{children}</h2>,
                h3: ({ children }: any) => <h3 style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '0.3em 0', color: 'var(--text)' }}>{children}</h3>,
                p: ({ children }: any) => <p style={{ margin: '0.5em 0', color: 'var(--text)' }}>{children}</p>,
                ul: ({ children }: any) => <ul style={{ margin: '0.5em 0', paddingLeft: '1.5em', color: 'var(--text)' }}>{children}</ul>,
                ol: ({ children }: any) => <ol style={{ margin: '0.5em 0', paddingLeft: '1.5em', color: 'var(--text)' }}>{children}</ol>,
                li: ({ children }: any) => <li style={{ margin: '0.2em 0', color: 'var(--text)' }}>{children}</li>,
                strong: ({ children }: any) => <strong style={{ fontWeight: 'bold', color: 'var(--text)' }}>{children}</strong>,
                em: ({ children }: any) => <em style={{ fontStyle: 'italic', color: 'var(--text)' }}>{children}</em>,
                table: ({ children }: any) => (
                  <div style={{ 
                    overflowX: 'auto', 
                    margin: '1.5em 0',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <table style={{ 
                      borderCollapse: 'collapse', 
                      width: '100%', 
                      fontSize: '0.9em',
                      background: 'var(--bg-elev)',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }: any) => (
                  <thead style={{ 
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: '#ffffff'
                  }}>
                    {children}
                  </thead>
                ),
                tbody: ({ children }: any) => <tbody>{children}</tbody>,
                tr: ({ children }: any) => (
                  <tr style={{ 
                    borderBottom: '1px solid var(--border)',
                    transition: 'background-color 0.2s ease'
                  }}>
                    {children}
                  </tr>
                ),
                th: ({ children }: any) => (
                  <th style={{ 
                    padding: '14px 18px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    fontSize: '0.9em',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase',
                    color: '#ffffff',
                    border: 'none',
                    background: 'transparent'
                  }}>
                    {children}
                  </th>
                ),
                td: ({ children }: any) => {
                  const content = String(children);
                  const isNumeric = /^[\+\-\$€]?[\d,]+\.?\d*[%]?$/.test(content.trim());
                  const isPositive = content.includes('+') || (isNumeric && parseFloat(content.replace(/[^\d.-]/g, '')) > 0);
                  const isNegative = content.includes('-') || (isNumeric && parseFloat(content.replace(/[^\d.-]/g, '')) < 0);
                  
                  return (
                    <td style={{ 
                      padding: '14px 18px', 
                      border: 'none',
                      color: isPositive && isNumeric ? '#10b981' : isNegative && isNumeric ? '#ef4444' : 'var(--text)',
                      fontSize: '0.9em',
                      lineHeight: '1.5',
                      fontWeight: isNumeric ? '600' : 'normal',
                      textAlign: isNumeric ? 'right' : 'left',
                      fontFamily: isNumeric ? 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace' : 'inherit',
                      background: 'var(--bg-elev)'
                    }}>
                      {children}
                    </td>
                  );
                },
                code: ({ children }: any) => (
                  <code style={{ 
                    background: 'var(--bg-elev)', 
                    padding: '2px 4px', 
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                    fontSize: '0.9em',
                    color: 'var(--text)'
                  }}>
                    {children}
                  </code>
                ),
                pre: ({ children }: any) => (
                  <pre style={{ 
                    background: 'var(--bg-elev)', 
                    padding: '12px', 
                    borderRadius: '6px',
                    overflow: 'auto',
                    margin: '0.5em 0',
                    border: '1px solid var(--border)'
                  }}>
                    {children}
                  </pre>
                ),
                blockquote: ({ children }: any) => (
                  <blockquote style={{ 
                    borderLeft: '4px solid var(--primary)', 
                    paddingLeft: '12px', 
                    margin: '0.5em 0',
                    fontStyle: 'italic',
                    color: 'var(--text-muted)'
                  }}>
                    {children}
                  </blockquote>
                )
              }}
            >
              {notification.response}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: 16, 
          borderTop: '1px solid var(--border)', 
          background: 'var(--bg-elev)',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            💡 This response was generated in the background while you were navigating
          </div>
          <button 
            className="button primary" 
            onClick={onClose}
            style={{ 
              padding: '8px 16px',
              borderRadius: 8
            }}
          >
            Perfect! 👍
          </button>
        </div>
      </div>
    </div>
  )
}
