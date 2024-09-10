import React, {FC, useLayoutEffect, useRef, useState} from "react"
import {FaUpload} from "react-icons/fa";
import {extractTitleFromFileName} from "../FileUpload";
import {useTracks} from "@/hooks/UseTracks";
import {createPortal} from "react-dom";

interface IProps {

}

const DragAndDropWrapper: FC<IProps> = () => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false)
    const {uploadTrack, fetchTracks} = useTracks();
    const [portal, setPortal] = useState<Element | null>(null);
    const onDragEnter = (e: DragEvent) => {
        e.preventDefault()
        setShowModal(true)
    }
    const onDragLeave = () => setShowModal(false)
    const onDrop = async (event: DragEvent) => {
        event.preventDefault();
        setShowModal(true)
        const files = event.dataTransfer?.files || null;
        const itemLength = event.dataTransfer?.items.length || 0;
        setShowModal(true)
        if (itemLength > 0) {
            if (fileInputRef.current?.files) {
                fileInputRef.current.files = files
                setUploading(true);
                for (let i = 0; i < itemLength; i++) {
                    const file: File | undefined = files?.[i]
                    if (!file) continue;
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('name', extractTitleFromFileName(file.name));
                    try {
                        const success = await uploadTrack(formData); // Use the uploadTrack function from the hook
                        if (success) {
                            console.log('Track uploaded successfully');
                            await fetchTracks();
                            // Optionally, refetch tracks to update the list
                        } else {
                            console.error('Track upload failed with no error thrown');
                        }

                    } catch (error) {
                        console.error('Error during file upload:', error);
                    }
                }
                setUploading(false);
            }
        }
        setShowModal(false)

    };
    useLayoutEffect(() => {
        setPortal(document.body)
        window.addEventListener('drop', onDrop)
        window.addEventListener('dragover', onDragEnter)
        window.addEventListener('dragenter', onDragEnter)
        window.addEventListener('dragleave', onDragLeave)
        return () => {
            window.removeEventListener('drop', onDrop)
            window.removeEventListener('dragover', onDragEnter)
            window.removeEventListener('dragenter', onDragEnter)
            window.removeEventListener('dragleave', onDragLeave)
        }
    }, [])
    return portal && createPortal(
        <React.Fragment>
            <div
                ref={wrapperRef}
                className={`grid place-content-center fixed inset-0 w-full h-full ${showModal || uploading ? "bg-black/20 pointer-events-auto" : 'pointer-events-none'}`}
            >
                <input
                    ref={fileInputRef}
                    className="inset-0 absolute opacity-0 w-full h-full hidden"
                    type="file"
                    accept="image/*"
                />
            </div>
            {(showModal || uploading) && (
                <div
                    className="border-2 border-dotted p-8 flex m-auto -z-10 flex-col space-y-4 items-center fixed inset-0 w-fit h-fit">
                    <FaUpload/>
                    <span>{uploading ? "File uploading" : "Drop file To upload"}</span>
                </div>
            )}
        </React.Fragment>
        , portal)
}
export default DragAndDropWrapper