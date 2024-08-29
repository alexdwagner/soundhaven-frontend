import React, { FC, useRef, useState } from "react";
import { FaUpload } from "react-icons/fa";
import { extractTitleFromFileName } from "../FileUpload";
import { useTracks } from "@/hooks/UseTracks";
import { usePlaylists } from "@/hooks/UsePlaylists";

interface IProps {
  activateOnDragEnter?: boolean; // Activates the wrapper when dragging enters
  activateOnDrop?: boolean; // Activates the wrapper when a drop occurs
  children: React.ReactNode; // The content wrapped inside
  className?: string; // Optional className for styling the wrapper
}

const DragAndDropWrapper: FC<IProps> = ({
  activateOnDragEnter = false,
  activateOnDrop = true,
  children,
  className,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { uploadTrack, fetchTracks } = useTracks();
  const { addTrackToPlaylist } = usePlaylists();

  const onDragEnter = () => {
    if (activateOnDragEnter) setShowModal(true);
  };

  const onDragLeave = () => {
    if (activateOnDragEnter) setShowModal(false);
  };

  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const files = event.dataTransfer.files;
    const trackId = event.dataTransfer.getData("text/plain");
    const isFileDrop = files.length > 0;
    const isTrackDrop = Boolean(trackId);

    if (isFileDrop) {
      // Handle file upload
      if (activateOnDrop) {
        setShowModal(false);
        if (fileInputRef.current) {
          fileInputRef.current.files = files;
          setUploading(true);
          for (let i = 0; i < files.length; i++) {
            const file: File = files[i];
            const formData = new FormData();
            formData.append("file", file);
            formData.append("name", extractTitleFromFileName(file.name));
            try {
              const success = await uploadTrack(formData);
              if (success) {
                console.log("Track uploaded successfully");
                await fetchTracks();
              } else {
                console.error("Track upload failed with no error thrown");
              }
            } catch (error) {
              console.error("Error during file upload:", error);
            }
          }
          setUploading(false);
        }
      }
    } else if (isTrackDrop) {
      // Handle track being dropped onto a playlist
      const playlistElement = document.elementFromPoint(
        event.clientX,
        event.clientY
      );

      if (playlistElement && playlistElement.dataset.playlistId) {
        const playlistId = Number(playlistElement.dataset.playlistId);
        try {
          await addTrackToPlaylist(playlistId, Number(trackId));
          console.log(`Successfully added track ${trackId} to playlist ${playlistId}`);
        } catch (error) {
          console.error(
            `Failed to add track ${trackId} to playlist ${playlistId}:`,
            error
          );
        }
      }
    }
  };

  const handlePreventDefault = (e: React.DragEvent<HTMLDivElement>) =>
    e.preventDefault();

  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragOver={handlePreventDefault}
      ref={wrapperRef}
      className={`${className} ${showModal || uploading ? "bg-black/20" : ""}`}
      style={{ zIndex: showModal || uploading ? 1000 : "auto" }}
    >
      {children}
      {(showModal || uploading) && (
        <div
          className="absolute inset-0 flex items-center justify-center border-2 border-dotted p-8 bg-white bg-opacity-90"
          style={{ zIndex: 1001 }}
        >
          <FaUpload />
          <span>{uploading ? "File uploading" : "Drop file to upload"}</span>
        </div>
      )}
    </div>
  );
};

export default DragAndDropWrapper;
