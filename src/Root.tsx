import React from "react";
import { Composition, Folder } from "remotion";
import {
  DemoShort,
  DemoShortWithCaptions,
  DemoFrames,
} from "./videos/demo/Bridge";
import { DemoCaptionOverlay } from "./videos/demo/DemoCaptionOverlay";
import { DemoCaptionsOnly } from "./videos/demo/CaptionsOnly";
import {
  MerdekaShort,
  MerdekaShortWithCaptions,
  MerdekaFrames,
} from "./videos/merdeka/Bridge";
import { MerdekaCaptionOverlay } from "./videos/merdeka/MerdekaCaptionOverlay";
import { MerdekaCaptionsOnly } from "./videos/merdeka/CaptionsOnly";
import {
  SeandainyaShort,
  SeandainyaShortWithCaptions,
  SeandainyaFrames,
  CHAPTERS as SEANDAINYA_CHAPTERS,
} from "./videos/seandainya/Bridge";
import { SeandainyaCaptionOverlay } from "./videos/seandainya/SeandainyaCaptionOverlay";
import { SeandainyaCaptionsOnly } from "./videos/seandainya/CaptionsOnly";
import { PoseGallery, PropGallery, POSE_PAGES, PROP_PAGES } from "./kit/gallery/Galleries";

export const Root: React.FC = () => {
  return (
    <>
      <Folder name="Kit">
        <Composition id="KitPoseGallery" component={PoseGallery} durationInFrames={POSE_PAGES} fps={30} width={1080} height={1920} />
        <Composition id="KitPropGallery" component={PropGallery} durationInFrames={PROP_PAGES} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="Seandainya">
        <Composition
          id="SeandainyaShort"
          component={SeandainyaShort}
          durationInFrames={SeandainyaFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="SeandainyaShortWithCaptions"
          component={SeandainyaShortWithCaptions}
          durationInFrames={SeandainyaFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="SeandainyaCaptionOverlay"
          component={SeandainyaCaptionOverlay}
          durationInFrames={SeandainyaFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="SeandainyaCaptionGreenScreen"
          component={() => <SeandainyaCaptionOverlay bg="#00FF00" />}
          durationInFrames={SeandainyaFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="SeandainyaCaptions"
          component={SeandainyaCaptionsOnly}
          durationInFrames={SeandainyaFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        {SEANDAINYA_CHAPTERS.map((ch) => (
          <Composition
            key={ch.stem}
            id={`SeandainyaCh${String(ch.num).padStart(2, "0")}`}
            component={() => <SeandainyaShortWithCaptions frameOffset={ch.f_a} />}
            durationInFrames={ch.f_b - ch.f_a}
            fps={30}
            width={1080}
            height={1920}
          />
        ))}
      </Folder>
      <Folder name="Merdeka">
        <Composition
          id="MerdekaShort"
          component={MerdekaShort}
          durationInFrames={MerdekaFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="MerdekaShortWithCaptions"
          component={MerdekaShortWithCaptions}
          durationInFrames={MerdekaFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="MerdekaCaptionOverlay"
          component={MerdekaCaptionOverlay}
          durationInFrames={MerdekaFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="MerdekaCaptionGreenScreen"
          component={() => <MerdekaCaptionOverlay bg="#00FF00" />}
          durationInFrames={MerdekaFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="MerdekaCaptions"
          component={MerdekaCaptionsOnly}
          durationInFrames={MerdekaFrames}
          fps={30}
          width={1080}
          height={1920}
        />
      </Folder>
      <Folder name="Demo">
        <Composition
          id="DemoShort"
          component={DemoShort}
          durationInFrames={DemoFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="DemoShortWithCaptions"
          component={DemoShortWithCaptions}
          durationInFrames={DemoFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="DemoCaptionOverlay"
          component={DemoCaptionOverlay}
          durationInFrames={DemoFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="DemoCaptionGreenScreen"
          component={() => <DemoCaptionOverlay bg="#00FF00" />}
          durationInFrames={DemoFrames}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="DemoCaptions"
          component={DemoCaptionsOnly}
          durationInFrames={DemoFrames}
          fps={30}
          width={1080}
          height={1920}
        />
      </Folder>
    </>
  );
};
