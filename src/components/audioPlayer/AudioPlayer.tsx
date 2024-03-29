import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';

import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { RegionParams } from 'wavesurfer.js/src/plugin/regions';

import { Track, _Comment, Marker } from '../../../types/types';

import debounce from 'lodash/debounce';

import AudioControls from './AudioControls';
import TrackInfo from './TrackInfo';
import Modal from '../Modal';

import { useComments } from '@/hooks/UseComments';
import { useAuth } from '@/contexts/AuthContext';
import { useTracks } from '@/hooks/UseTracks';
import { usePlayback } from '@/hooks/UsePlayback';

import { CustomRegionWrapper } from './CustomRegion';


interface AudioPlayerProps {
  track: Track;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  playbackSpeed: number;
  onPlaybackSpeedChange: (speed: number) => void;
  volume: number;
  onVolumeChange: (speed: number) => void;
  onTogglePlay: () => void;
  onSelectComment: (commentId: number) => void;
  showComments: boolean;
  toggleComments: () => void;
}


const AudioPlayer: React.FC<AudioPlayerProps> = ({
  track,
  onTogglePlay,
  isFavorite,
  onToggleFavorite,
  playbackSpeed,
  volume,
  onSelectComment,
  toggleComments,
  showComments,
}) => {
  const { user, token } = useAuth();
  const { currentTrack, isPlaying, togglePlayback } = usePlayback();

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [regionParams, setRegionParams] = useState<RegionParams | null>(null);
  const { fetchTrack } = useTracks();

  const regionsRef = useRef<RegionsPlugin | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  const [waveSurferReady, setWaveSurferReady] = useState(false);

  const selectedRegionIdRef = useRef(null);

  const {
    comments,
    markers,
    setMarkers,
    addMarkerAndComment,
    fetchCommentsAndMarkers,
    selectedCommentId,
    setSelectedCommentId,
    selectedRegionId,
    setSelectedRegionId,
    regionCommentMap,
    setRegionCommentMap,
  } = useComments(waveSurferRef, regionsRef);

  console.log("Markers in AudioPlayer, after destruc useComments:•", markers);

  const customRegionsRef = useRef<Map<string, CustomRegionWrapper>>(new Map());

  const onSelectRegion = useCallback((marker: Marker) => {
    // Logic to select the associated comment and update the UI accordingly
    setSelectedCommentId(marker.commentId);
  }, []);

  // console.log("Region-Comment Map in AudioPlayer:", regionCommentMap);

  // Debounced double click handler defined with useCallback at the top level
  const debouncedHandleDoubleClick = useCallback(debounce((e) => {
    if (regionsRef.current && waveformRef.current) {
      const clickPositionX = e.clientX - waveformRef.current.getBoundingClientRect().left;
      const clickTime = waveSurferRef.current.getDuration() * (clickPositionX / waveformRef.current.offsetWidth);

      console.log('About to add region. Current regions:', regionsRef.current.regions);
      const region = regionsRef.current.addRegion({
        start: clickTime,
        color: 'rgba(255, 165, 0, 0.5)',
        drag: false,
        resize: false,
      });

      setRegionParams({
        id: region.id,
        start: clickTime,
        end: clickTime + 1,
        color: 'rgba(255, 165, 0, 0.5)'
      });

      setModalOpen(true);
    }
  }, 300), [setRegionParams, setModalOpen]);

  const handleRegionClick = useCallback((regionId) => {
    const commentId = regionCommentMap[regionId];
    if (commentId) {
      onSelectComment(commentId); // Assume onSelectComment updates the selectedCommentId in shared state/context
      if (!showComments) {
        toggleComments(); // This function should change the state to make CommentsPanel visible
      }
    }
  }, [regionCommentMap, onSelectComment, showComments, toggleComments]);

  // Disables spacebar playing/pausing audio when comment modal is open.
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if modal is open and the pressed key is the spacebar
      if (modalOpen && event.code === 'Space') {
        event.preventDefault(); // Prevent the default spacebar action (play/pause)
      }
    };

    // Add event listener when component mounts
    document.addEventListener('keydown', handleKeyDown);

    // Remove event listener on cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalOpen]);

  // Main hook for waveform initialization
  useEffect(() => {

    if (waveformRef.current) {

      setIsLoading(true);

      const ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'purple',
        progressColor: 'grey',
        backend: 'WebAudio',
      });

      waveSurferRef.current = ws;

      console.log("WaveSurfer instance created:", ws);

      // Register the Regions plugin and keep a reference in a ref or state
      const regionsPlugin = ws.registerPlugin(RegionsPlugin.create())
      regionsRef.current = regionsPlugin;

      console.log("Regions plugin registered:", regionsPlugin);

      const trackUrl = encodeURI(`${process.env.NEXT_PUBLIC_BACKEND_URL}/${track.filePath}`);
      waveSurferRef.current.load(trackUrl);

      ws.on('decode', () => {
        console.log('Track loaded');
      });

      ws.on('ready', () => {
        setIsLoading(false); // Set loading state to false when WaveSurfer is ready
        setWaveSurferReady(true);
        console.log('WaveSurfer is ready. Duration:', ws.getDuration());

        // Listener for region clicks
        regionsPlugin.on('region-clicked', (region, event) => {
          event.stopPropagation(); // prevent triggering click on the waveform
          // console.log('Region clicked. Region.id:', region.id);
          console.log('Region clicked. Region:•', region);
          console.log('Region id:•', region.id);

          const markerData = region.data as Marker;
          console.log('Marker data:', markerData);

          const waveSurferRegionID = region.id;
          console.log('waveSurferRegionID in region-clicked:•', waveSurferRegionID);

          const commentId = regionCommentMap[waveSurferRegionID];
          console.log('Comment ID (from map) in region-clicked:•', commentId);
          console.log('regionCommentMap in region-clicked:•', regionCommentMap);

          setSelectedCommentId(commentId || null);
          setSelectedRegionId(region.id);
          console.log('Updated selectedCommentId:•', commentId || null);
          console.log('Updated selectedRegionId:•', region.id);

          // If comments panel is not shown, open it
          if (!showComments) {
            toggleComments();
          }

            // If there is a previously selected region
            if (selectedRegionIdRef.current) {
              console.log('Regions:', regionsRef.current?.regions);
              console.log('Previous selectedRegionId:', selectedRegionIdRef.current);

              const prevRegionIndex = regionsRef.current?.regions.findIndex((region) => region.id === selectedRegionIdRef.current);
              const prevRegion = regionsRef.current?.regions[prevRegionIndex];

              console.log('Previous region:', prevRegion);

              if (prevRegion) {
                prevRegion.setOptions({ color: 'rgba(255, 0, 0, 0.5)' }); // Reset previous region color
                // console.log('Previous region color changed:', region.id, region.color);
              }
            }

            // Highlight the clicked region and update the selected region only if it's different from the current one
            if (selectedRegionIdRef.current !== region.id) {
              region.setOptions({ color: 'rgba(0, 255, 0, 0.7)' }); // Change color
              // console.log('Current region color changed:', region.id, region.color);

              selectedRegionIdRef.current = region.id; // Update state to reflect the newly selected region

            } else {
              // If the same region is clicked again, reset its color to deselect it and update the selected region to null
              region.setOptions({ color: 'rgba(255, 0, 0, 0.5)' }); // Reset region color
              // console.log('Current region color changed:', region.id, region.color);

              selectedRegionIdRef.current = null; // Update state to reflect that no region is selected
            }
            console.log('New selectedRegionId:', selectedRegionIdRef.current);

            // Optional: Perform actions based on the selected region, such as displaying a comment related to this marker
          });
      });

      ws.on('error', (error) => {
        console.error('WaveSurfer error:', error);
      });

      // Add the debounced event listener
      const waveformElement = waveformRef.current;
      waveformElement.addEventListener('dblclick', debouncedHandleDoubleClick);

      // Cleanup
      return () => {
        ws.destroy();
        waveformElement.removeEventListener('dblclick', debouncedHandleDoubleClick);
      };
    }
  }, [track.filePath, debouncedHandleDoubleClick]);

  useEffect(() => {
    console.log('Selected Comment ID:', selectedCommentId);
  }, [selectedCommentId]);

  // Implement this to use fetchTrack from the useTracks hook
  useEffect(() => {
    if (track?.id) {
      fetchTrack(track.id).then(fetchedTrack => {
        // Use fetchedTrack as needed
      }).catch(error => {
        console.error('Failed to fetch track:', error);
      });
    }
  }, [track?.id, fetchTrack]);

  const updateMarkerFromRegion = (marker: Marker, region: any): Marker => {
    return {
      ...marker,
      waveSurferRegionID: region.id,
      time: region.start,

      // Potential Updates:
      end: region.end, // Update the marker's end time if meaningful in your application

      data: {
        ...marker.data, // Spread existing data to preserve
        customColor: region.color,  // Sync color changes  
        isDraggable: region.drag,   // Update draggable property
        isResizable: region.resize  // Update resizable property
      }
    };
  };

  // useEffect for loading regions once WaveSurfer is ready and comments/markers have been fetched
  const loadRegions = useMemo(() => () => {
    if (waveSurferReady && regionsRef.current && markers.length > 0) {
      // Clear any existing regions or custom region wrappers
      regionsRef.current.clearRegions();
      customRegionsRef.current.clear();

      markers.forEach(marker => {
        // Define region parameters
        const regionParams = {
          start: marker.time,
          end: marker.time + 0.5,
          color: 'rgba(255, 0, 0, 0.5)',
          drag: false,
          resize: false,
        };

        // Add region to WaveSurfer instance
        const region = regionsRef.current.addRegion(regionParams);

        // Wrap region with CustomRegionWrapper and pass onSelectRegion
        const customRegion = new CustomRegionWrapper(region, marker, onSelectRegion);

        // Store custom region wrapper for later use
        customRegionsRef.current.set(region.id, customRegion);
      });
    }
  }, [waveSurferReady, markers, onSelectRegion]);

  useEffect(() => {
    loadRegions(); // Call the memoized function to load regions

    console.log('regionCommentMap in useEffect loadRegions:', regionCommentMap);

    return () => {
      if (regionsRef.current) {
        regionsRef.current.clearRegions();
      }
    };
  }, [loadRegions, regionCommentMap]);

  useEffect(() => {
    if (track.id && !isLoading) {
      fetchCommentsAndMarkers(track.id)
        .then(() => {
          console.log('Comments and markers fetched successfully.•');
          console.log('Markers:•', markers); // Log the markers array
          // Populate regionCommentMap here
          const newRegionCommentMap: Record<string, number> = markers.reduce((map: Record<string, number>, marker) => {
            if (marker.waveSurferRegionID && marker.commentId) {
              console.log('Mapping waveSurferRegionID to commentId:•', marker.waveSurferRegionID, marker.commentId);
              map[marker.waveSurferRegionID] = marker.commentId;
            } else {
              console.log('Invalid marker:•', marker); // Log markers with missing waveSurferRegionID or commentId
            }
            return map;
          }, {});
          console.log('New regionCommentMap:•', newRegionCommentMap);
          setRegionCommentMap(newRegionCommentMap); // Use the setRegionCommentMap from useComments
        })
        .catch(error => console.error('Error fetching comments and markers:•', error));
    }
  }, [track.id, isLoading, setRegionCommentMap]);

  const handleCommentSubmit = async (submittedComment) => {
    console.log('Submitted comment:', submittedComment);
    if (!user || !token) {
      console.error("User or token not available");
      return;
    }

    console.log('token inside handleCommentSubmit:', token)

    try {
      if (regionParams) {
        const { time: startTime, id: waveSurferRegionID } = regionParams;

        // Log the request payload for debugging
        console.log('Sending request to add comment with marker:', {
          trackId: track.id,
          content: submittedComment,
          time: startTime,
          waveSurferRegionID: waveSurferRegionID,
          token: token
        });

        await addMarkerAndComment(track.id, submittedComment, startTime, waveSurferRegionID, token);
      } else {
        console.log("No marker associated with this comment (skipping marker creation).");
      }
      console.log("Comment (and potentially marker) added successfully");
      setModalOpen(false);
      setComment('');
    } catch (error) {
      console.error("Error submitting comment (and marker):", error);
    }

  };

  // Handle play/pause when isPlaying changes or component mounts
  useEffect(() => {
    // Log the current state to debug
    console.log(`Is playing: ${isPlaying}, Is loading: ${isLoading}`);

    const wavesurfer = waveSurferRef.current;
    if (wavesurfer && !isLoading) {
      try {
        if (isPlaying) {
          console.log('Playing audio');
          wavesurfer.play();
        } else {
          console.log('Pausing audio');
          wavesurfer.pause();
        }
      } catch (error) {
        console.error('Error with play/pause:', error);
        setError(`Playback error: ${error}`);
      }
    }
  }, [isPlaying, isLoading]);

  const handlePlayPause = () => {
    onTogglePlay();
  };

  const handleSkipForward = () => {
    // Implement skipping forward
  };

  const handleSkipBackward = () => {
    // Implement skipping backward
  };

  const handlePlayNext = () => {
    // Implement playing next track
  };

  const handlePlayPrevious = () => {
    // Implement playing previous track
  };

  const handlePlaybackSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    wavesurferRef.current?.setPlaybackRate(newSpeed);
  };

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    wavesurferRef.current?.setVolume(newVolume);
  };

  return (
    <div>
      {track && (
        <div>
          <TrackInfo track={track} />

          <div ref={waveformRef} style={{ height: '128px', width: '100%' }} />
          <AudioControls
            isPlaying={isPlaying}
            onPlayPause={togglePlayback}
            onSkipForward={handleSkipForward}
            onSkipBackward={handleSkipBackward}
            onPlayNext={handlePlayNext}
            onPlayPrevious={handlePlayPrevious}
            onPlaybackSpeedChange={handlePlaybackSpeedChange}
            onToggleFavorite={handleToggleFavorite}
            onVolumeChange={handleVolumeChange}
            isFavorite={isFavorite}
            playbackSpeed={playbackSpeed}
            volume={volume}
            onTogglePlay={togglePlayback}
          />
        </div>

      )}

      {modalOpen && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleCommentSubmit(comment); // Directly use the comment state
            setComment(''); // Clear the comment input after submission
          }}>
            <input
              name="comment"
              type="text"
              placeholder="Enter comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)} // Update comment state on change
            />
            <button type="submit">Submit</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AudioPlayer;
