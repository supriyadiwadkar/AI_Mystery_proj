export function evidenceImagePrompt(description:string):string {
  return `Create a cinematic, realistic fictional evidence photograph for a PG-13 detective mystery. Use fictional people and places only. Do not include logos, readable text, graphic violence, or actionable harmful details. Preserve the clue in this visual description: <visual_clue>${description}</visual_clue>.`;
}
export function cctvFramePrompt(cameraLabel:string,note:string):string {
  return `Create one static monochrome security-camera frame for a fictional PG-13 mystery. Fixed wide angle, low-light grain, no readable text, no logos, no real people. Camera label: <camera>${cameraLabel}</camera>. Frame note: <scene_note>${note}</scene_note>. Keep the scene ordinary and consistent with a fixed camera.`;
}
