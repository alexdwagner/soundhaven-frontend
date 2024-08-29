import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  memo,
} from "react";
import { Playlist, Track } from "../../../types/types";
import { usePlaylists } from "@/hooks/UsePlaylists";
import { useAuth } from "@/hooks/UseAuth";
import { useTracks } from "@/hooks/UseTracks";
import PlaylistItem from "./PlaylistItem";
import DuplicateTrackModal from "./DuplicateTrackModal";
// import {
//   DndContext,
//   useDraggable,
//   useDroppable,
// } from "@dnd-kit/core";
// import {
//   SortableContext,
//   sortableKeyboardCoordinates,
//   arrayMove,
//   verticalListSortingStrategy,
// } from '@dnd-kit/sortable';

// import DragDropErrorBoundary from "@/error-boundaries/DragDropErrorBoundary";

interface PlaylistSidebarProps {
  onSelectPlaylist: (tracks: Track[], playlistId: number) => void;
  onViewAllTracks: () => void;
  onDeletePlaylist: (playlistId: number) => void;
}

const PlaylistSidebar: React.FC<PlaylistSidebarProps> = ({
  onSelectPlaylist,
  onViewAllTracks,
  onDeletePlaylist,
}) => {
  const {
    playlists,
    createPlaylist,
    deletePlaylist,
    fetchPlaylists,
    addTrackToPlaylist,
    fetchPlaylistById,
    updatePlaylistOrder,
    setPlaylists,
    updatePlaylistMetadata,
  } = usePlaylists();
  const { user, token } = useAuth();
  const { fetchTracks } = useTracks();
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [editingPlaylistId, setEditingPlaylistId] = useState<number | null>(
    null
  );
  const [playlistName, setPlaylistName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(
    null
  );

  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateTrackInfo, setDuplicateTrackInfo] = useState<{
    playlistId: number;
    trackId: number;
  } | null>(null);

  const libraryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (token) {
      fetchPlaylists();
    }
  }, [token, fetchPlaylists]);

  useEffect(() => {
    if (editingPlaylistId !== null) {
      const playlist = playlists.find((pl) => pl.id === editingPlaylistId);
      if (playlist) {
        setPlaylistName(playlist.name);
      }
    }
  }, [editingPlaylistId, playlists]);

  const handleCreatePlaylist = async () => {
    try {
      console.log("Creating new playlist...");
      const newName = `New Playlist ${playlists.length + 1}`;
      console.log("New playlist name:", newName);

      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("User:", user);
      console.log("User ID:", user.id);

      const playlistData: Omit<Playlist, "id" | "user" | "tracks"> = {
        name: newName,
        userId: user.id,
        description: "A new playlist",
      };

      console.log("Playlist data being sent:", playlistData);

      const newPlaylist = await createPlaylist(playlistData);

      console.log(
        "New playlist received:",
        JSON.stringify(newPlaylist, null, 2)
      );
      console.log("New playlist type:", typeof newPlaylist);
      console.log("New playlist keys:", Object.keys(newPlaylist));

      if (!newPlaylist) {
        console.error("New playlist is falsy:", newPlaylist);
        throw new Error("Failed to create new playlist: Playlist is falsy");
      }

      if (!newPlaylist.id) {
        console.error("New playlist has no id:", newPlaylist);
        throw new Error("Failed to create new playlist: Playlist has no id");
      }

      console.log("Playlist creation completed successfully");
      console.log(
        "Adding new playlist to state:",
        JSON.stringify(newPlaylist, null, 2)
      );
    } catch (error) {
      console.error("Error creating playlist:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create playlist"
      );
    }
  };

  const handlePlaylistNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaylistName(e.target.value);
  };

  const handlePlaylistNameBlur = async () => {
    if (editingPlaylistId !== null) {
      await updatePlaylistMetadata(editingPlaylistId, { name: playlistName });
      setEditingPlaylistId(null);
    }
  };

  const handleAddTrackToPlaylist = async (
    playlistId: number,
    trackId: number,
    force: boolean = false
  ) => {
    try {
      const result = await addTrackToPlaylist(playlistId, trackId, force);
      if (result.status === "DUPLICATE" && !force) {
        setDuplicateTrackInfo({ playlistId, trackId });
        setIsDuplicateModalOpen(true);
      } else {
        console.log("Track added successfully:", result);
        // Update the playlist in the UI
        const updatedPlaylist = await fetchPlaylistById(playlistId);
        if (updatedPlaylist) {
          setPlaylists((prevPlaylists) =>
            prevPlaylists.map((p) =>
              p.id === playlistId ? updatedPlaylist : p
            )
          );
        }
      }
    } catch (error) {
      console.error("Error adding track to playlist:", error);
      setError("Failed to add track to playlist");
    }
  };

  // const handleDrop = async (
  //   e: React.DragEvent<HTMLLIElement>,
  //   playlistId: number
  // ) => {
  //   e.preventDefault();
  //   const trackId = e.dataTransfer.getData("text/plain");
  //   await handleAddTrackToPlaylist(playlistId, Number(trackId));
  // };

  const handleConfirmDuplicateAdd = async () => {
    if (duplicateTrackInfo) {
      await handleAddTrackToPlaylist(
        duplicateTrackInfo.playlistId,
        duplicateTrackInfo.trackId,
        true
      );
      setIsDuplicateModalOpen(false);
      setDuplicateTrackInfo(null);
    }
  };

  const handlePlaylistSelect = async (playlistId: number) => {
    try {
      const playlist = await fetchPlaylistById(playlistId);
      console.log(`Fetched playlist ${playlistId}:`, playlist);
      if (playlist && playlist.tracks) {
        onSelectPlaylist(playlist.tracks, playlistId);
        setSelectedPlaylistId(playlistId);
      } else {
        console.error("Playlist or tracks not found");
        setError("Failed to load playlist tracks");
      }
    } catch (error: any) {
      if (error.message === "Forbidden resource") {
        console.error(
          "Access forbidden: You do not have permission to view this playlist."
        );
      } else {
        console.error("Error fetching playlist:", error);
      }
      setError("Failed to load playlist");
    }
  };

  const handleDeletePlaylist = useCallback(
    async (playlistId: number) => {
      try {
        await deletePlaylist(playlistId);
        setSelectedPlaylistId(null);
        onDeletePlaylist(playlistId);
        libraryButtonRef.current?.focus();
      } catch (error) {
        console.error("Error deleting playlist:", error);
        setError("Failed to delete playlist");
      }
    },
    [deletePlaylist, onDeletePlaylist]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedPlaylistId !== null
      ) {
        event.preventDefault();
        handleDeletePlaylist(selectedPlaylistId);
      }
    },
    [selectedPlaylistId, handleDeletePlaylist]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Create state var for isLoading, setIsLoading
  // if (isLoading) {
  //   return <div>Loading playlists...</div>;
  // }

  if (!token) {
    return null; // Or return a message like "Please log in to view playlists"
  }

  console.log(
    "Playlist IDs before render:",
    playlists.map((p) => p.id)
  );

  // console.log("Rendering Droppable");

  // const handleDragEnd = (event) => {
  //   const { active, over } = event;
  //   if (active.id !== over.id) {
  //     const oldIndex = playlists.findIndex((p) => p.id === Number(active.id));
  //     const newIndex = playlists.findIndex((p) => p.id === Number(over.id));
  //     const reorderedPlaylists = arrayMove(playlists, oldIndex, newIndex);
  //     setPlaylists(reorderedPlaylists);
  //     updatePlaylistOrder(reorderedPlaylists.map((p) => p.id));
  //   }
  // };

  return (
    // <DndContext onDragEnd={handleDragEnd}>
      <div className="playlist-sidebar p-4 bg-gray-800 text-white min-w-48">
        <button
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-2 rounded"
          onClick={handleCreatePlaylist}
        >
          Add Playlist
        </button>
        <button
          ref={libraryButtonRef}
          className="w-full hover:text-blue-400 text-white font-bold py-2 mt-2 rounded my-1 text-left"
          onClick={onViewAllTracks}
        >
          {user ? `${user.name}'s Library` : "Anon’s Library"}
        </button>

        <h3 className="font-bold my-1 py-2 border-b border-t border-gray-600">
          Playlists
        </h3>
{/* 
        <SortableContext
          items={playlists.map((p) => p.id.toString())}
          strategy={verticalListSortingStrategy}
        > */}
          <ul className="px-1">
            {playlists.map((playlist) => (
              <PlaylistItem
                key={playlist.id}
                playlist={playlist}
                onEdit={() => {}}
                onSelect={() => handlePlaylistSelect(playlist.id)}
                isSelected={playlist.id === selectedPlaylistId}
                // onDrop={(e) => {
                //   const trackId = Number(e.dataTransfer.getData("text/plain"));
                //   handleAddTrackToPlaylist(playlist.id, trackId);
                // }}
                onDelete={() => handleDeletePlaylist(playlist.id)}
              />
            ))}
          </ul>
        {/* </SortableContext> */}

        <DuplicateTrackModal
          isOpen={isDuplicateModalOpen}
          onClose={() => setIsDuplicateModalOpen(false)}
          onConfirm={handleConfirmDuplicateAdd}
        />
      </div>
    // </DndContext>
  );
};

export default PlaylistSidebar;
