import Image from "next/image";
import WaitlistForm from "../WaitlistForm";

/* The closing beat: once the zoom-out reveals the billboard, this compact
   card fades in over the sky band (the original form peeled away with the
   poster). Visibility is gated by the stage timeline via autoAlpha. */

export default function FinalCta() {
  return (
    <div className="flex flex-col items-center px-6 pt-[3dvh]">
      <div className="pointer-events-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl bg-[#2b0d00]/35 p-5 text-center ring-1 ring-white/15 backdrop-blur-md">
        <Image
          src="/peel-logo.png"
          alt="Peel"
          width={937}
          height={420}
          className="h-8 w-auto"
        />
        <h2 className="text-[clamp(1.3rem,2.4vw,1.9rem)] font-bold leading-tight">
          Put your brand on their block.
        </h2>
        <WaitlistForm idSuffix="-cta" />
      </div>
    </div>
  );
}
