import { Link } from "react-router";
// MODIFIED: Trying a new relative path (two levels up)
import ScoreCircle from "../../app/components/ScoreCircle";
// MODIFIED: Removed 'MouseEvent' from import
import { useEffect, useState } from "react";
import type { Resume } from "../routes/types"; // <-- Kept your new path
// MODIFIED: Trying a new relative path (two levels up)
import { usePuterStore } from "../../app/lib/puter";

// Define the props for the component
type ResumeCardProps = {
  resume: Resume;
  // Add an onDelete prop
  // It's a function that will be passed from the parent component
  onDelete: (id: string, imagePath: string) => Promise<void>;
};

const ResumeCard = ({
  resume: { id, companyName, jobTitle, feedback, imagePath },
  onDelete, // Destructure the new prop
}: ResumeCardProps) => {
  const { fs } = usePuterStore();
  const [resumeUrl, setResumeUrl] = useState("");
  // MODIFIED: We only need one state now to hide it.
  const [isDeleted, setIsDeleted] = useState(false); // State to make card vanish

  useEffect(() => {
    const loadResume = async () => {
      // Handle case where imagePath might be missing
      if (!imagePath) return;
      try {
        const blob = await fs.read(imagePath);
        if (!blob) return;
        let url = URL.createObjectURL(blob);
        setResumeUrl(url);
      } catch (err) {
        console.error("Failed to load resume image:", err);
        // If fs.read fails (e.g., file not found), this will catch it
      }
    };

    loadResume();

    // Clean up the object URL on component unmount
    return () => {
      if (resumeUrl) {
        URL.revokeObjectURL(resumeUrl);
      }
    };
  }, [imagePath, fs, resumeUrl]);

  // Handler for the delete button
  // MODIFIED: Removed the MouseEvent type from 'e' as requested
  const handleDelete = async (e: any) => {
    // CRITICAL: Stop the click from bubbling up to the <Link>
    e.preventDefault();
    e.stopPropagation();

    // HIDE THE CARD IMMEDIATELY.
    setIsDeleted(true);

    // Ngayon, subukan nating i-delete sa background.
    try {
      // Call the function passed from the parent
      await onDelete(id, imagePath);
    } catch (err) {
      console.error("Failed to delete resume in background:", err);
      // Naka-hide na 'yung card, so 'di na makikita ng user 'tong error.
    }
  };

  // If the card is marked as deleted, render nothing.
  if (isDeleted) {
    return null;
  }

  return (
    <Link
      to={`/resume/${id}`}
      // Added position: relative
      className="resume-card animate-in fade-in duration-1000 relative"
    >
      {/* Delete Button */}
      <button
        type="button"
        onClick={handleDelete} // This will now match the expected type
        className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        aria-label="Delete resume"
      >
        <span className="text-lg font-bold leading-none">&times;</span>
      </button>

      <div className="resume-card-header">
        <div className="flex flex-col gap-2">
          {companyName && (
            <h2 className="!text-black font-bold break-words">{companyName}</h2>
          )}
          {jobTitle && (
            <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>
          )}
          {!companyName && !jobTitle && (
            <h2 className="!text-black font-bold">Resume</h2>
          )}
        </div>
        <div className="flex-shrink-0">
          <ScoreCircle score={feedback.overallScore} />
        </div>
      </div>
      {resumeUrl && (
        <div className="gradient-border-1 animate-in fade-in duration-1000">
          <div className="w-full h-full">
            <img
              src={resumeUrl}
              alt="resume"
              className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
            />
          </div>
        </div>
      )}
      {/* Show a placeholder if no image exists */}
      {!resumeUrl && (
        <div className="flex w-full h-[350px] max-sm:h-[200px] items-center justify-center rounded-lg bg-gray-100 object-cover object-top text-gray-400">
          No Image
        </div>
      )}
    </Link>
  );
};
export default ResumeCard;
