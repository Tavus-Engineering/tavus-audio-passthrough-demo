import { useEffect, useRef, useState } from 'react'
import { useDaily, useParticipantIds, useVideoTrack } from '@daily-co/daily-react'

function VideoPlayer({ roomUrl }) {
  const callObject = useDaily()
  const [isJoining, setIsJoining] = useState(true)
  const [error, setError] = useState(null)
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

  // Debug video state
  useEffect(() => {
    console.log('Selected replica ID:', replicaId)
    console.log('Video state:', videoState)
  }, [replicaId, videoState])

  // Attach video track to video element
  useEffect(() => {
    if (videoRef.current && videoState?.persistentTrack) {
      console.log('Attaching video track:', videoState.persistentTrack)
      const videoEl = videoRef.current
      videoEl.srcObject = new MediaStream([videoState.persistentTrack])

      // Try to play the video
      videoEl.play().catch(err => {
        console.error('Error playing video:', err)
        // If autoplay fails, add a click handler
        videoEl.addEventListener('click', () => {
          videoEl.play()
        }, { once: true })
      })
    } else {
      console.log('No video track available yet', { videoRef: !!videoRef.current, persistentTrack: !!videoState?.persistentTrack })
    }
  }, [videoState?.persistentTrack])

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
        muted
        className="replica-video"
      />
      {replicaId && (
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '5px', fontSize: '12px' }}>
          Connected to: {callObject?.participants()?.[replicaId]?.user_name || 'Unknown'}
        </div>
      )}
    </div>
  )
}

export default VideoPlayer
