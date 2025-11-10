import { type FormEvent, useState } from "react";
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { convertPdfToImage } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions, AIResponseFormat } from "../../constants";

// ✅ Define a type for our error state
type FormErrors = {
  companyName?: string;
  jobTitle?: string;
  jobDescription?: string;
  file?: string;
};

const Upload = () => {
  const { isLoading, fs, ai, kv } = usePuterStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // ✅ Add state to hold validation errors
  const [errors, setErrors] = useState<FormErrors>({});

  const handleFileSelect = (file: File | null) => {
    setFile(file);
    // ✅ Clear file error when user selects a new file
    if (file) {
      setErrors((prev) => ({ ...prev, file: undefined }));
    }
  };

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  }) => {
    setIsProcessing(true);

    setStatusText("Uploading the file...");
    const uploadedFile = await fs.upload([file]);
    if (!uploadedFile) {
      setStatusText("Error: Failed to upload file");
      setIsProcessing(false); // ✅ Stop processing on error
      return;
    }

    setStatusText("Converting to image...");
    const imageFile = await convertPdfToImage(file);
    if (!imageFile.file) {
      setStatusText("Error: Failed to convert PDF to image");
      setIsProcessing(false); // ✅ Stop processing on error
      return;
    }

    setStatusText("Uploading the image...");
    const uploadedImage = await fs.upload([imageFile.file]);
    if (!uploadedImage) {
      setStatusText("Error: Failed to upload image");
      setIsProcessing(false); // ✅ Stop processing on error
      return;
    }

    setStatusText("Preparing data...");
    const uuid = generateUUID();
    const data = {
      id: uuid,
      resumePath: uploadedFile.path,
      imagePath: uploadedImage.path,
      companyName,
      jobTitle,
      jobDescription,
      feedback: "",
    };
    await kv.set(`resume:${uuid}`, JSON.stringify(data));

    setStatusText("Analyzing...");

    const feedback = await ai.feedback(
      uploadedFile.path,
      prepareInstructions({ jobTitle, jobDescription, AIResponseFormat })
    );
    if (!feedback) {
      setStatusText("Error: Failed to analyze resume");
      setIsProcessing(false); // ✅ Stop processing on error
      return;
    }

    const feedbackText =
      typeof feedback.message.content === "string"
        ? feedback.message.content
        : feedback.message.content[0].text;

    try {
      data.feedback = JSON.parse(feedbackText);
    } catch (error) {
      console.error("Failed to parse AI feedback:", error);
      setStatusText("Error: Failed to parse analysis. Please try again.");
      setIsProcessing(false); // ✅ Stop processing on error
      return;
    }

    await kv.set(`resume:${uuid}`, JSON.stringify(data));
    setStatusText("Analysis complete, redirecting...");
    console.log(data);
    navigate(`/resume/${uuid}`);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setErrors({});

    const form = e.currentTarget.closest("form");
    if (!form) return;
    const formData = new FormData(form);

    const companyName = (formData.get("company-name") as string).trim();
    const jobTitle = (formData.get("job-title") as string).trim();
    const jobDescription = (formData.get("job-description") as string).trim();

    const newErrors: FormErrors = {};
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    if (!companyName) newErrors.companyName = "Company name is required.";
    if (!jobTitle) newErrors.jobTitle = "Job title is required.";
    if (!jobDescription)
      newErrors.jobDescription = "Job description is required.";

    if (!file) {
      newErrors.file = "A resume file is required.";
    } else if (file.type !== "application/pdf") {
      newErrors.file = "Only PDF files are allowed.";
    } else if (file.size > MAX_FILE_SIZE) {
      newErrors.file = "File is too large (max 5MB).";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    handleAnalyze({ companyName, jobTitle, jobDescription, file: file! }); // We know file is not null here
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Intelligent insights for your career</h1>
          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img src="/images/resume-scan.gif" className="w-full" />
            </>
          ) : (
            <h2>Drop your resume for your interview</h2>
          )}
          {!isProcessing && (
            <form
              id="upload-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mt-8"
            >
              <div className="form-div">
                <label htmlFor="company-name" className="text-white">
                  Company Name
                </label>
                <input
                  type="text"
                  name="company-name"
                  placeholder="Company Name"
                  id="company-name"
                />
                {errors.companyName && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.companyName}
                  </p>
                )}
              </div>

              <div className="form-div">
                <label htmlFor="job-title" className="text-white">
                  Job Title
                </label>
                <input
                  type="text"
                  name="job-title"
                  placeholder="Job Title"
                  id="job-title"
                />
                {errors.jobTitle && (
                  <p className="text-red-500 text-sm mt-1">{errors.jobTitle}</p>
                )}
              </div>

              <div className="form-div">
                <label htmlFor="job-description" className="text-white">
                  Job Description
                </label>
                <textarea
                  rows={5}
                  name="job-description"
                  placeholder="Job Description"
                  id="job-description"
                />
                {errors.jobDescription && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.jobDescription}
                  </p>
                )}
              </div>

              <div className="form-div">
                <label htmlFor="uploader" className="text-white">
                  Upload Resume (PDF only)
                </label>

                {file ? (
                  <div className="flex items-center justify-between mt-2 p-3 bg-dark-2 text-white rounded-lg">
                    <span className="truncate" title={file.name}>
                      {file.name}
                    </span>
                    <button
                      type="button" // Prevents the button from submitting the form
                      onClick={() => handleFileSelect(null)} // Clears the file
                      className="ml-4 text-red-500 hover:text-red-400 font-bold text-xl"
                      aria-label="Remove file"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  // Shows the uploader component only if no file is selected
                  <FileUploader
                    onFileSelect={handleFileSelect}
                    // accept="application/pdf"
                  />
                )}

                {errors.file && (
                  <p className="text-red-500 text-sm mt-1 ">{errors.file}</p>
                )}
              </div>

              <button className="primary-button" type="submit">
                Analyze Resume
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};
export default Upload;
