import { useEffect, useState, useCallback } from 'react'
import { DailyProvider } from '@daily-co/daily-react'
import VideoPlayer from './VideoPlayer'
import './App.css'

// Import conversation URL if available
let conversationConfig = { url: null };
try {
  conversationConfig = await import('./conversation-url.json');
} catch (e) {
  // File doesn't exist yet, that's ok
}

function App() {
  const [roomUrl, setRoomUrl] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [isAutoJoining, setIsAutoJoining] = useState(false)

  // Poll for conversation URL updates (when launcher provides it)
  useEffect(() => {
    const checkForUrl = async () => {
      try {
        const response = await fetch('/src/conversation-url.json');
        if (response.ok) {
          const config = await response.json();
          if (config.url && config.url !== roomUrl && !hasJoined) {
            console.log('Auto-joining with URL:', config.url);
            setRoomUrl(config.url);
            setIsAutoJoining(true);
            setIsJoining(true);
            setHasJoined(true);
          }
        }
      } catch (e) {
        // File doesn't exist yet or network error
      }
    };

    // Check immediately
    checkForUrl();

    // Then poll every 2 seconds
    const interval = setInterval(checkForUrl, 2000);

    return () => clearInterval(interval);
  }, [roomUrl, hasJoined]);

  const handleJoin = useCallback(() => {
    if (roomUrl.trim()) {
      setIsJoining(true)
      setHasJoined(true)
    }
  }, [roomUrl])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && roomUrl.trim() && !hasJoined) {
      handleJoin()
    }
  }, [roomUrl, hasJoined, handleJoin])

  return (
    <div className="app">
      {!hasJoined ? (
        <div className="join-screen">
          <div className="join-container">
            <h1>Tavus Replica Viewer</h1>
            {isAutoJoining ? (
              <>
                <p>Auto-connecting to Tavus replica...</p>
                <div className="spinner" style={{ margin: '20px auto' }}></div>
              </>
            ) : (
              <>
                <p>Enter the Tavus conversation URL to view the animated replica</p>
                <input
                  type="text"
                  value={roomUrl}
                  onChange={(e) => setRoomUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="https://tavus.daily.co/xxxxx"
                  className="room-input"
                  autoFocus
                />
                <button
                  onClick={handleJoin}
                  disabled={!roomUrl.trim() || isJoining}
                  className="join-button"
                >
                  {isJoining ? 'Joining...' : 'Join Room'}
                </button>
                <p style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
                  Tip: Use the launcher script to auto-connect
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <DailyProvider>
          <VideoPlayer roomUrl={roomUrl} />
        </DailyProvider>
      )}
    </div>
  )
}

export default App
