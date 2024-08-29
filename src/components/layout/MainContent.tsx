import React, { useState, useRef, useEffect, useCallback } from "react";
import FileUpload from "../FileUpload";
import TracksTable from "../tracks/TracksTable";
import ErrorMessage from "../ErrorMessage";
import AudioPlayer from "../audioPlayer/AudioPlayer";
import CommentsPanel from "../comments/CommentsPanel";
import { useTracks } from "@/hooks/UseTracks";
import { usePlayback } from "@/hooks/UsePlayback";
import { Track, Comment } from "../../../types/types";
import { useComments } from "@/hooks/UseComments";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import PlaylistSidebar from "../playlists/PlaylistSidebar";
import DuplicateTrackModal from "../playlists/DuplicateTrackModal";
import { usePlaylists } from "@/hooks/UsePlaylists";
import DeleteConfirmationModal from "../modals/DeleteConfirmationModal";
import DragAndDropWrapper from '@/components/layout/DragAndDropWrapper';

interface MainContentProps {
  error: string;
}

const MainContent: React.FC<MainContentProps> = ({ error }) => {
  const {
    isPlaying,
    currentTrack,
    currentTrackIndex,
    togglePlayback,
    selectTrack,
    setIsCommentInputFocused,
  } = usePlayback();
  const [showComments, setShowComments] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedPlaylistTracks, setSelectedPlaylistTracks] = useState<Track[]>(
    []
  );

  const {
    comments,
    fetchCommentsAndMarkers,
    fetchComments,
    addMarkerAndComment,
    addComment,
    handleSelectComment,
  } = useComments();

  const [isLoading, setIsLoading] = useState(false);
  const {
    tracks,
    fetchTracks,
    deleteTrack,
    showDeleteModal,
    setShowDeleteModal,
    doNotAskAgain,
    setDoNotAskAgain,
  } = useTracks();
  const [displayTracks, setDisplayTracks] = useState<Track[]>([]);
  const [isPlaylistSelected, setIsPlaylistSelected] = useState(false);

  const regionsRef = useRef<RegionsPlugin | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  const { removeTrackFromPlaylist, updatePlaylistTrackOrder } = usePlaylists();

  const [selectedCommentId, setSelectedCommentId] = useState<number | null>(
    null
  );

  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(
    null
  );

  // Load all tracks when the component mounts
  useEffect(() => {
    fetchTracks();
  }, []);

  useEffect(() => {
    if (isPlaylistSelected) {
      console.log(
        "Setting display tracks to selected playlist tracks:",
        selectedPlaylistTracks
      );
      setDisplayTracks(selectedPlaylistTracks);
    } else {
      console.log("Setting display tracks to all tracks:", tracks);
      setDisplayTracks(tracks);
    }
  }, [isPlaylistSelected, selectedPlaylistTracks, tracks]);

  // Add useEffect to listen for track changes and clear errors
  useEffect(() => {
    console.log("MainContent: Tracks updated", tracks);
    setFetchError(null);
  }, [tracks]);

  // Add useEffect to listen for track clearing
  useEffect(() => {
    if (tracks.length === 0) {
      console.log("Tracks cleared in MainContent");
    }
  }, [tracks]);

  const handleSelectPlaylist = async (
    playlistTracks: Track[],
    playlistId: number
  ) => {
    console.log("Selecting playlist with tracks:", playlistTracks);
    setSelectedPlaylistTracks(playlistTracks); // Set the new playlist tracks
    setIsPlaylistSelected(true);
    setSelectedPlaylistId(playlistId);
    // setDisplayTracks(playlistTracks);
  };

  const clearSelectedPlaylist = () => {
    console.log("Clearing selected playlist");
    setSelectedPlaylistTracks([]);
    setIsPlaylistSelected(false);
  };

  // Update the handleUploadSuccess function to use fetchTracks directly
  const handleUploadSuccess = async () => {
    console.log("MainContent: Handling upload success.");
    await fetchTracks();
  };

  const handleSelectTrack = (
    trackId: number,
    trackFilePath: string,
    trackIndex: number
  ) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track) {
      selectTrack(track, trackIndex);
    }
  };

  const handleUpdateTrack = async (
    trackId: number,
    field: string,
    value: string
  ) => {
    console.log(
      `Attempting to send PATCH request: ${trackId}, ${field}, ${value}`
    );
    try {
      const response = await fetch(`/api/tracks/${trackId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error("Failed to update the track");
      }

      const updatedTrack = await response.json();
      setTracks((prevTracks) =>
        prevTracks.map((track) =>
          track.id === trackId ? { ...track, ...updatedTrack } : track
        )
      );
    } catch (error: unknown) {
      // Ensure this catch block is aligned correctly
      if (error instanceof Error) {
        console.error("Error updating track:", error.message);
      }
    }
  };

  const toggleComments = () => {
    console.log("Toggle Comments button clicked");
    console.log("Toggling comments. Current state:", showComments);
    console.log("Current track:", currentTrack);
    setShowComments(!showComments);
  };

  useEffect(() => {
    console.log("Current track:", currentTrack);
    console.log("Show comments:", showComments);
  }, [currentTrack, showComments]);

  // console.log('Rendering AudioPlayer with track:', currentTrack);

  const handleCommentClick = (commentId: number) => {
    setSelectedCommentId(commentId);
  };

  // const handleCommentSelected = (commentId: number) => {
  //   setSelectedCommentId(commentId);
  // };

  const DEFAULT_TRACK_ID = -1;

  // Determine the default track
  const defaultTrack: Track =
    tracks.length > 0
      ? tracks[0]
      : {
          id: DEFAULT_TRACK_ID,
          name: "Careless Whisper",
          duration: 0,
          filePath: "public/careless_whisper.mp3",
          createdAt: "",
          updatedAt: "",
          playlists: [],
          genres: [],
        };

  const handleKeyDown = useCallback(
    async (event: KeyboardEvent) => {
      console.log("Key pressed:", event.key);
      console.log("Selected track ID:", selectedTrackId);
      console.log("Is playlist selected:", isPlaylistSelected);
      console.log("Selected playlist ID:", selectedPlaylistId);

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedTrackId !== null
      ) {
        event.preventDefault();

        if (isPlaylistSelected && selectedPlaylistId) {
          try {
            await removeTrackFromPlaylist(selectedPlaylistId, selectedTrackId);
            setSelectedPlaylistTracks((prev) =>
              prev.filter((track) => track.id !== selectedTrackId)
            );
            setDisplayTracks((prev) =>
              prev.filter((track) => track.id !== selectedTrackId)
            );
            setSelectedTrackId(null);
          } catch (error) {
            console.error("Error removing track from playlist:", error);
            setFetchError(
              "Failed to remove track from playlist. Please try again."
            );
          }
        } else {
          if (!doNotAskAgain) {
            setShowDeleteModal(true);
          } else {
            try {
              await deleteTrack(selectedTrackId);
              setDisplayTracks((prev) =>
                prev.filter((track) => track.id !== selectedTrackId)
              );
              setSelectedTrackId(null);
              if (currentTrack?.id === selectedTrackId) {
                selectTrack(null, null);
              }
            } catch (error) {
              console.error("Error deleting track:", error);
              setFetchError("Failed to delete track. Please try again.");
            }
          }
        }
      }
    },
    [
      selectedTrackId,
      isPlaylistSelected,
      selectedPlaylistId,
      doNotAskAgain,
      deleteTrack,
      removeTrackFromPlaylist,
      currentTrack,
      selectTrack,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleDeletePlaylist = useCallback(
    (playlistId: number) => {
      setSelectedPlaylistTracks([]);
      setIsPlaylistSelected(false);
      setSelectedPlaylistId(null);
      fetchTracks().then((allTracks) => {
        setDisplayTracks(allTracks);
      });
    },
    [fetchTracks]
  );

  const handleReorderTracks = useCallback(
    async (startIndex: number, endIndex: number) => {
      if (isPlaylistSelected && selectedPlaylistId) {
        const reorderedTracks = Array.from(selectedPlaylistTracks);
        const [reorderedItem] = reorderedTracks.splice(startIndex, 1);
        reorderedTracks.splice(endIndex, 0, reorderedItem);

        setSelectedPlaylistTracks(reorderedTracks);
        setDisplayTracks(reorderedTracks);

        try {
          await updatePlaylistTrackOrder(
            selectedPlaylistId,
            reorderedTracks.map((track) => track.id)
          );
        } catch (error) {
          console.error("Error updating track order:", error);
          setFetchError("Failed to update track order. Please try again.");
          // Revert to the original order if the API call fails
          setSelectedPlaylistTracks(selectedPlaylistTracks);
          setDisplayTracks(selectedPlaylistTracks);
        }
      }
    },
    [
      isPlaylistSelected,
      selectedPlaylistId,
      selectedPlaylistTracks,
      updatePlaylistTrackOrder,
    ]
  );

  useEffect(() => {
    const handleDrag = (event) => {
      console.log('Dragging:', event);
    };
    const handleDrop = (event) => {
      console.log('Dropping:', event);
    };

    window.addEventListener('dragstart', handleDrag);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragstart', handleDrag);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  return (
    <main className="flex flex-col p-4 mx-auto w-full">

      <div className="flex">
        <div className="w-1/4">

        <DragAndDropWrapper className="relative">
        <PlaylistSidebar
            onSelectPlaylist={handleSelectPlaylist}
            onViewAllTracks={clearSelectedPlaylist}
            onDeletePlaylist={handleDeletePlaylist}
          />
        </DragAndDropWrapper>

        </div>
        <div className="w-3/4">
          <button
            onClick={toggleComments}
            className={`toggle-comments-btn absolute ${
              !currentTrack ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={!currentTrack}
          >
            {showComments ? "Close Comments" : "Open Comments"}
          </button>

          {/* Display error passed as props */}
          {error && <ErrorMessage message={error} />}
          {/* Display fetch error */}
          {fetchError && <ErrorMessage message={fetchError} />}

          <div className="w-full px-8 items-center">
            <div className="audio-player-container w-full max-w-3xl mx-auto">
              <AudioPlayer track={currentTrack || defaultTrack} />
            </div>
          </div>
          <FileUpload onUploadSuccess={handleUploadSuccess} />

          <DragAndDropWrapper className="relative">

          <TracksTable
            tracks={displayTracks}
            onSelectTrack={handleSelectTrack}
            onUpdate={handleUpdateTrack}
            isPlaylistView={isPlaylistSelected}
            currentPlaylistId={selectedPlaylistId}
            removeTrackFromPlaylist={removeTrackFromPlaylist}
            deleteTrack={deleteTrack}
            onDelete={deleteTrack}
            setSelectedTrackId={setSelectedTrackId}
            selectedTrackId={selectedTrackId}
            onReorderTracks={handleReorderTracks}
          />
          </DragAndDropWrapper>


          {/* <div className="flex flex-col"> */}
          {currentTrack?.id && showComments && (
            <CommentsPanel
              trackId={currentTrack.id}
              show={showComments}
              onClose={toggleComments}
              comments={comments}
              addComment={addComment}
              regionsRef={regionsRef}
              waveSurferRef={waveSurferRef}
              handleCommentClick={handleCommentClick}
              // selectedCommentId={selectedCommentId}
              setIsCommentInputFocused={setIsCommentInputFocused}
            />
          )}
        </div>
      </div>
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          if (selectedTrackId !== null) {
            try {
              await deleteTrack(selectedTrackId);
              setDisplayTracks((prev) =>
                prev.filter((track) => track.id !== selectedTrackId)
              );
              if (currentTrack?.id === selectedTrackId) {
                selectTrack(null, null);
              }
              setSelectedTrackId(null);
            } catch (error) {
              console.error("Error deleting track:", error);
              setFetchError("Failed to delete track. Please try again.");
            }
          }
          setShowDeleteModal(false);
        }}
        doNotAskAgain={doNotAskAgain}
        setDoNotAskAgain={setDoNotAskAgain}
      />
    </main>
    // </div>
  );
};

export default MainContent;
