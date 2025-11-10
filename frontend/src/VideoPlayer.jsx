import { useEffect, useRef, useState } from 'react'
import { useDaily, useParticipantIds, useVideoTrack, useAudioTrack } from '@daily-co/daily-react'

function VideoPlayer({ roomUrl }) {
  const callObject = useDaily()
  const [isJoining, setIsJoining] = useState(true)
  const [error, setError] = useState(null)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef(null)
  const participantIds = useParticipantIds({ filter: 'remote' })

  // Debug: log all participants
  useEffect(() => {
    if (participantIds.length > 0) {
      console.log('Remote participants:', participantIds)
      participantIds.forEach(id => {
        console.log(`Participant ${id}:`, callObject?.participants()?.[id])
      })
    }
  }, [participantIds, callObject])

  // Find the Tavus replica participant by name
  const replicaId = participantIds.find(id => {
    const participant = callObject?.participants()?.[id]
    const userName = participant?.user_name || ''
    // Look for Tavus-related participant names
    return userName.includes('Tavus') ||
           userName.includes('Echo Audio Stream') ||
           userName.includes('pipecat-stream') ||
           participant?.tracks?.video?.state === 'playable'
  }) || participantIds[0]

  const videoState = useVideoTrack(replicaId)
  const audioState = useAudioTrack(replicaId)

  // Join the room using the DailyProvider's call object
  useEffect(() => {
    if (!callObject) return

    const joinRoom = async () => {
      try {
        await callObject.join({
          url: roomUrl,
          userName: 'Viewer',
          startVideoOff: true,
          startAudioOff: true,
        })

        console.log('Successfully joined room')
        setIsJoining(false)

        // Disable local camera and microphone
        callObject.setLocalAudio(false)
        callObject.setLocalVideo(false)
      } catch (err) {
        console.error('Error joining room:', err)
        setError(err.message)
        setIsJoining(false)
      }
    }

    joinRoom()
  }, [callObject, roomUrl])

  // Debug video and audio state
  useEffect(() => {
    console.log('Selected replica ID:', replicaId)
    console.log('Video state:', videoState)
    console.log('Audio state:', audioState)
  }, [replicaId, videoState, audioState])

  // Attach video and audio tracks to video element
  useEffect(() => {
    if (videoRef.current && videoState?.persistentTrack) {
      console.log('Attaching tracks - Video:', videoState.persistentTrack, 'Audio:', audioState?.persistentTrack)
      const videoEl = videoRef.current

      // Create MediaStream with both video and audio tracks
      const tracks = [videoState.persistentTrack]
      if (audioState?.persistentTrack) {
        tracks.push(audioState.persistentTrack)
      }

      videoEl.srcObject = new MediaStream(tracks)

      // Start muted for autoplay
      videoEl.muted = true
      videoEl.play()
        .then(() => {
          console.log('Video playing (muted)')
        })
        .catch(err => {
          console.error('Error playing video:', err)
        })
    } else {
      console.log('No video track available yet', {
        videoRef: !!videoRef.current,
        videoTrack: !!videoState?.persistentTrack,
        audioTrack: !!audioState?.persistentTrack
      })
    }
  }, [videoState?.persistentTrack, audioState?.persistentTrack])

  // Handle unmute click
  const handleUnmute = () => {
    if (videoRef.current) {
      videoRef.current.muted = false
      setIsMuted(false)
      videoRef.current.play()
    }
  }

  // Auto-unmute on any click or keypress anywhere on the page
  useEffect(() => {
    const handleUserInteraction = () => {
      if (isMuted && videoRef.current && replicaId) {
        console.log('Auto-unmuting from user interaction')
        handleUnmute()
      }
    }

    // Add listeners for both click and keypress
    document.addEventListener('click', handleUserInteraction)
    document.addEventListener('keydown', handleUserInteraction)

    return () => {
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
    }
  }, [isMuted, replicaId])

  if (error) {
    return (
      <div className="error-screen">
        <h2>Error joining room</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (isJoining) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Joining room...</p>
      </div>
    )
  }

  if (!replicaId) {
    return (
      <div className="waiting-screen">
        <div className="spinner"></div>
        <p>Waiting for Tavus replica to join...</p>
      </div>
    )
  }

  return (
    <div className="video-container">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="replica-video"
      />

      {/* Unmute notification */}
      {isMuted && replicaId && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '30px',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 10,
            animation: 'pulse 2s ease-in-out infinite'
          }}
        >
          <span style={{ fontSize: '18px' }}>🔊</span>
          Press any key or click to enable audio
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Status indicator */}
      {replicaId && (
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '5px', fontSize: '12px' }}>
          Connected to Tavus Network
          {isMuted && ' (Muted)'}
        </div>
      )}
    </div>
  )
}

export default VideoPlayer
