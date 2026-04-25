import path from 'path';
import os from 'os';

const CONFIG = {
  BROWSER_PATH: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  PROFILE_DIR: "C:\\temp\\prism_profile",
  PORT: 9223,
  URLS: { 
    site: "https://label-prism.vercel.app/tasks", 
    chat: "https://gemini.google.com/app"
  } as Record<string, string>,
  
  TEMP_IMAGE_PATH: path.resolve(os.tmpdir(), "prism_temp_image.png"),
  
  PROMPT: `You are a Senior Image Evaluation Specialist. Your task is to compare the attached Input Image and Output Image, identify meaningful visual differences, and generate clear transformation instructions based on the Nidra Image Output Editing Guideline.

Evaluate visible transformations in this strict order of importance:
1. Subject (Pose, expression, gaze, direction)
2. Objects / Attributes (Clothes, props, additions, removals)
3. Background / Environment (Location, lighting, scenery)
4. Style / Visual Tone (Color grading, mood)

Tool Logic:
- Box (B): Large areas or objects.
- Arrow (A): Movement or direction.
- Pin (C) / Point: Small details.
- Draw (D): Irregular shapes or missing regions.

OUTPUT CONSTRAINTS (STRICT):
Output ONLY a Markdown table. Do NOT output JSON. Do NOT include introductory or concluding text. 
Use this exact format:

| Category | Tool to Use | Reason | Transformation Instruction |
|---|---|---|---|
| [Category] | [Tool] | [Brief reasoning] | [Start with verb: Add/Remove/Change/Replace] |`
};

export default CONFIG;