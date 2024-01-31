import React, { useState, useEffect, useContext } from 'react';
import { TracksContext } from '@/contexts/TracksContext';
import { PlaybackContext } from '@/contexts/PlaybackContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import { Track, Artist, Album, Comment, User } from '@/types';
import { deleteTrack, fetchArtists, fetchAlbums } from '../services/apiService';
import Modal from './Modal'; // Import your modal component
import EditTrackForm from './EditTrackForm';
import { serializeValue } from '@/utils/utils';

interface TracksTableProps {
  onDelete: (id: number) => void;
  onUpdate: (id: number, field: string, value: string) => void;
  onSelectTrack: (trackId: number, trackFilePath: string, trackIndex: number) => void;
}

const TracksTable: React.FC<TracksTableProps> = ({ onDelete, onUpdate, onSelectTrack }) => {
  const { tracks } = useContext(TracksContext);
  const { selectTrack } = useContext(PlaybackContext);

  if (!tracks) {
    console.error('TracksContext not found');
    return null; // or some error component
  }
  
  console.log("TracksTable received tracks: ", tracks);

  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [openMenuTrackId, setOpenMenuTrackId] = useState<number | null>(null);

  console.log("TracksTable received tracks: ", tracks);

  // Fetch artists and albums only once on component mount
  useEffect(() => {
    let isMounted = true;
    const loadArtistsAndAlbums = async () => {
      try {
        const [loadedArtists, loadedAlbums] = await Promise.all([fetchArtists(), fetchAlbums()]);
        if (isMounted) {
          setArtists(loadedArtists);
          setAlbums(loadedAlbums);
        }
      } catch (error) {
        console.error('Error fetching artists/albums:', error);
      }
    };
    loadArtistsAndAlbums();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    tracks.forEach(track => {
      if (!track.filePath) {
        console.error(`Track ID ${track.id} is missing a file path`);
      }
    });
  }, [tracks]);

  const openModal = (track: Track) => {
    setEditingTrack(track);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTrack(null);
  };

  const handleSave = (updatedTrackData: Partial<Track>) => {
    if (!editingTrack) return;
  
    (Object.keys(updatedTrackData) as Array<keyof Track>).forEach(field => {
      // Check if the field exists in editingTrack using a safer approach
      if (Object.prototype.hasOwnProperty.call(editingTrack, field)) {
        const oldValue = editingTrack[field];
        const newValue = updatedTrackData[field];
  
        if (oldValue !== newValue) {
          const valueToUpdate: string = serializeValue(newValue);
          onUpdate(editingTrack.id, field, valueToUpdate);
        }
      }
    });
  
    closeModal();
  };


  const handleDoubleClickOnRow = (track: Track, index: number) => {
    console.log("Double-clicked track:", track);
    if (track.filePath) {
      selectTrack(track, index); // Using selectTrack directly from PlaybackContext
    }
  };

  const toggleMenu = (id: number, event: React.MouseEvent) => {
    event.stopPropagation(); // This prevents the double-click event for playback
    setOpenMenuTrackId(openMenuTrackId === id ? null : id);
  };

  return (
    <>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artist</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Album</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tracks.map((track, index) => (
            <tr key={track.id} onDoubleClick={() => handleDoubleClickOnRow(track, index)}>
              <td className="px-4 py-2">{track.name}</td>
              <td className="px-4 py-2">{track.artist?.name ?? 'Unknown Artist'}</td>
              <td className="px-4 py-2">{track.album?.name ?? 'No Album'}</td>
              <td className="px-4 py-2">{track.duration}</td>
              <td className="px-4 py-2 relative">
                <button onClick={(e) => toggleMenu(track.id, e)}>•••</button>
                {openMenuTrackId === track.id && (
                  <div className="absolute right-0 bg-white shadow-lg rounded-md z-10">
                    <button className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => openModal(track)}>Edit Metadata</button>
                    <button className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(track.id); 
                      }}>
                      Delete Track
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {editingTrack && (
          <EditTrackForm
            track={editingTrack}
            onSave={handleSave}
          />
        )}
      </Modal>
    </>
  );
};

export default TracksTable;
