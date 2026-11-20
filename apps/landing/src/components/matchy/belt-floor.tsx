import { type StageSize, stageGeometry } from './belt-geometry';
import { EDGE_FADE } from './motion';

/**
 * Floor under the belt: soft brand glow, coloured ellipse and fine concentric rings. It fades out
 * on every side, so the stage has no visible box on the white page.
 */
export function BeltFloor({ size }: { size: StageSize }) {
  const { radii, centerX, centerY } = stageGeometry(size);
  const floorWidth = (radii.rx + 70) * 2;
  const floorHeight = (radii.ry + 26) * 2;
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${EDGE_FADE}`}>
      {/* soft brand glow behind the belt */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(97,188,166,0.12)_0%,rgba(255,255,255,0)_60%)]"
      />
      {/* colored floor under the belt */}
      <div
        aria-hidden="true"
        className="absolute rounded-[50%] bg-[radial-gradient(ellipse,rgba(255,255,255,1)_0%,rgba(97,188,166,0.22)_55%,rgba(47,118,187,0.18)_100%)] shadow-[0_30px_80px_-24px_rgba(47,118,187,0.30)]"
        style={{
          left: centerX - floorWidth / 2,
          top: centerY - floorHeight / 2,
          width: floorWidth,
          height: floorHeight,
        }}
      />
      {/* matte floor: fine concentric rings around the belt */}
      {[1, 1.35, 1.75].map((ring) => (
        <div
          key={ring}
          aria-hidden="true"
          className="border-brand-blue/10 absolute rounded-[50%] border"
          style={{
            left: centerX - (radii.rx + 40) * ring,
            top: centerY - (radii.ry + 14) * ring,
            width: (radii.rx + 40) * ring * 2,
            height: (radii.ry + 14) * ring * 2,
          }}
        />
      ))}
    </div>
  );
}
