// KIT: reference output height for the look. Ink widths, blur discs, grain and card shading are tuned at 1080x1920
// (REF.h = 1920). A landscape video (1920x1080) sets REF.h = 1080 so lines and blur keep the same look.
// Short.tsx sets REF.h = project.height before the post effects are built.
export const REF = { h: 1920 };
