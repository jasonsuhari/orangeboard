import type { CSSProperties, ReactNode } from "react";
import { PAL, px, pts } from "./city/iso";
import { Apartment, Bodega, RooftopBillboard, StreetBillboard, Tower, WallBillboard } from "./city/structures";
import {
  Bench,
  Ground,
  GroupWalkers,
  Mover,
  Runner,
  TrafficLight,
  Tree,
  Walker,
  WheelchairUser,
} from "./city/street";

/* ── Isometric city diorama ──────────────────────────────────────────────
   The world the boards live in: a hand-placed isometric block — towers,
   apartments, bodegas, a park — with pedestrians, signal cycles, and Peel
   creative rotating on the billboards. Pure SVG + CSS transforms/opacity so
   it renders on the server, ships no JS, and animates on the GPU. */

export default function IsometricCity({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const items: Array<{ d: number; node: ReactNode }> = [];
  const add = (d: number, node: ReactNode) => items.push({ d, node });
  const depth = (gx: number, gy: number, w = 0, d = 0) => gx + gy + w + d;

  /* NW block — downtown high-risers. The tallest carries the rooftop board. */
  add(
    depth(1.3, 1.3, 3, 3),
    <g key="towerA">
      <Tower gx={1.3} gy={1.3} w={3} d={3} h={188} floors={11} cols={3} seed={2} />
      <RooftopBillboard gx={2.0} gy={2.15} z={188} />
    </g>,
  );
  add(
    depth(5.6, 1.1, 2.6, 2.6),
    <g key="towerB">
      <Tower gx={5.6} gy={1.1} w={2.6} d={2.6} h={148} floors={9} cols={2} tone="ember" seed={5} />
      <polygon points={pts(px(6.9, 2.4, 168), px(7, 2.4, 168), px(7, 2.4, 148), px(6.9, 2.4, 148))} fill={PAL.pole} />
      <circle
        cx={px(6.95, 2.4, 170)[0]}
        cy={px(6.95, 2.4, 170)[1]}
        r="1.6"
        fill="#ff8866"
        className="iso-window"
        style={{ "--iso-flick": "2.2s" } as CSSProperties}
      />
    </g>,
  );
  add(depth(1.1, 5.4, 2.4, 2.4), <Tower key="towerC" gx={1.1} gy={5.4} w={2.4} d={2.4} h={118} floors={7} cols={2} seed={8} />);
  add(depth(5.4, 5.2, 3.2, 2.6), <Tower key="towerD" gx={5.4} gy={5.2} w={3.2} d={2.6} h={88} floors={5} cols={4} tone="ember" seed={11} />);
  add(depth(7.9, 8.1, 1), <Tree key="plaza-t1" gx={7.9} gy={8.1} s={0.85} />);
  add(depth(8.7, 6.6, 1), <Tree key="plaza-t2" gx={8.7} gy={6.6} s={0.7} />);

  /* NE block — apartments, walk-ups, and the corner bodega facing the avenue. */
  add(depth(14.0, 1.3, 2.8, 2.4), <Apartment key="apt1" gx={14.0} gy={1.3} w={2.8} d={2.4} h={78} floors={5} cols={3} seed={4} />);
  add(
    depth(17.6, 1.0, 3, 3),
    <g key="apt2">
      <Apartment gx={17.6} gy={1.0} w={3} d={3} h={102} floors={6} cols={3} tone="ember" seed={7} />
      <WallBillboard gx={20.6} gy={1.0} u0={1.35} u1={2.75} z0={44} z1={84} />
    </g>,
  );
  add(depth(14.0, 4.9, 2.4, 2), <Tower key="ne-n1" gx={14.0} gy={4.9} w={2.4} d={2} h={50} floors={3} cols={3} seed={9} />);
  add(depth(17.8, 5.2, 2.6, 2.2), <Tower key="ne-n2" gx={17.8} gy={5.2} w={2.6} d={2.2} h={62} floors={4} cols={3} tone="ember" seed={13} />);
  add(depth(14.0, 8.0, 2, 1.5), <Bodega key="bodega1" gx={14.0} gy={8.0} w={2} d={1.5} h={24} />);
  add(depth(16.9, 8.9, 1), <Tree key="ne-t1" gx={16.9} gy={8.9} s={0.75} />);
  add(depth(19.8, 8.9, 1), <Tree key="ne-t2" gx={19.8} gy={8.9} s={0.8} />);
  add(depth(15.6, 8.95, 1.05, 0.24), <Bench key="ne-bench" gx={15.6} gy={8.95} />);
  /* street-level board facing the avenue, on the open lot east of the bodega */
  add(depth(17.0, 9.05, 2.5), <StreetBillboard key="st-billboard" gx={17.0} gy={9.05} />);

  /* SW block — the park, plus a corner deli facing the cross street. */
  add(depth(1.6, 13.9, 1), <Tree key="p-t1" gx={1.6} gy={13.9} s={0.9} />);
  add(depth(7.6, 14.3, 1), <Tree key="p-t2" gx={7.6} gy={14.3} s={1.1} />);
  add(depth(3.4, 18.9, 1), <Tree key="p-t3" gx={3.4} gy={18.9} s={0.8} />);
  add(depth(8.6, 19.5, 1), <Tree key="p-t4" gx={8.6} gy={19.5} s={1.05} />);
  add(depth(2.2, 20.8, 1), <Tree key="p-t5" gx={2.2} gy={20.8} s={0.95} />);
  add(depth(6.8, 21.3, 1), <Tree key="p-t6" gx={6.8} gy={21.3} s={0.75} />);
  add(depth(3.1, 16.8, 1.05, 0.24), <Bench key="p-bench1" gx={3.1} gy={16.8} />);
  add(depth(6.6, 16.8, 1.05, 0.24), <Bench key="p-bench2" gx={6.6} gy={16.8} />);
  add(depth(8.0, 13.6, 1.5, 2), <Bodega key="bodega2" gx={8.0} gy={13.6} w={1.5} d={2} h={22} face="R" sign="DELI" />);

  /* SE block — mixed low-rise. */
  add(depth(13.8, 13.6, 2.6, 2.2), <Tower key="se-n1" gx={13.8} gy={13.6} w={2.6} d={2.2} h={58} floors={4} cols={3} seed={6} />);
  add(depth(17.4, 13.4, 2.8, 2.6), <Apartment key="apt3" gx={17.4} gy={13.4} w={2.8} d={2.6} h={84} floors={5} cols={3} tone="ember" seed={10} />);
  add(depth(17.6, 17.2, 2.4, 2.2), <Tower key="se-n2" gx={17.6} gy={17.2} w={2.4} d={2.2} h={44} floors={3} cols={3} seed={12} />);
  add(depth(14.1, 20.8, 1), <Tree key="se-t1" gx={14.1} gy={20.8} s={0.9} />);
  add(depth(14.6, 17.4, 1), <Tree key="se-t2" gx={14.6} gy={17.4} s={0.7} />);

  /* Traffic signals at the intersection corners; opposing axes alternate. */
  add(depth(9.5, 9.5), <TrafficLight key="tl-nw" gx={9.5} gy={9.5} phase="-7s" />);
  add(depth(12.6, 9.5, 0.4), <TrafficLight key="tl-ne" gx={12.75} gy={9.45} />);
  add(depth(9.45, 12.6, 0.4), <TrafficLight key="tl-sw" gx={9.45} gy={12.75} />);
  add(28, <TrafficLight key="tl-se" gx={13.05} gy={12.6} phase="-7s" />);

  /* Pedestrians. Depths are per-lane so walkers pass in front of the block
     behind them and behind the block ahead; negative delays scatter everyone
     along their routes on first paint. */
  add(
    30,
    <g key="peds-north">
      <Mover from={[0.4, 9.65]} to={[22.6, 9.65]} dur={36} delay={-14}>
        <Walker fill={PAL.creamInk} />
      </Mover>
      <Mover from={[22.6, 9.62]} to={[0.4, 9.62]} dur={13} delay={-4} flip>
        <Runner fill={PAL.ink} />
      </Mover>
    </g>,
  );
  add(
    31,
    <g key="peds-south">
      <Mover from={[0.4, 12.75]} to={[22.6, 12.75]} dur={44} delay={-22}>
        <GroupWalkers />
      </Mover>
      <Mover from={[22.6, 12.72]} to={[0.4, 12.72]} dur={30} delay={-9}>
        <Walker fill={PAL.ink} />
      </Mover>
    </g>,
  );
  add(
    27,
    <g key="peds-east">
      <Mover from={[12.75, 0.5]} to={[12.75, 22.5]} dur={34} delay={-17}>
        <Walker fill={PAL.inkSoft} />
      </Mover>
    </g>,
  );
  add(
    33,
    <g key="peds-west">
      <Mover from={[9.65, 22.5]} to={[9.65, 0.5]} dur={40} delay={-18}>
        <WheelchairUser fill={PAL.creamInk} />
      </Mover>
    </g>,
  );
  add(
    26,
    <g key="peds-park">
      <Mover from={[1.2, 17.6]} to={[8.4, 17.6]} dur={24} delay={-6}>
        <Walker fill={PAL.ink} />
      </Mover>
      <Mover from={[5.0, 13.6]} to={[5.0, 21.6]} dur={30} delay={-12} flip>
        <WheelchairUser fill={PAL.ink} />
      </Mover>
    </g>,
  );

  items.sort((a, b) => a.d - b.d);

  return (
    <svg viewBox="0 0 1200 860" className={className} style={style} aria-hidden="true">
      <g transform="translate(600 250)">
        <Ground />
        {items.map((it, i) => (
          <g key={i}>{it.node}</g>
        ))}
      </g>
    </svg>
  );
}
