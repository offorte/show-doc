import type { ReactNode } from "react";

import { Icon } from "./icons";
import type { PlacedActor, PlacedBlock, PlacedMessage, Point, SequenceLayout } from "./types";

function Lines({
  x,
  y,
  lines,
  step = 14,
}: {
  x: number;
  y: number;
  lines: string[];
  step?: number;
}) {
  const top = y - ((lines.length - 1) * step) / 2;
  return lines.map((line, index) => (
    <text key={index} x={x} y={top + index * step}>
      {line}
    </text>
  ));
}

function pathOf(points: Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

function headAt(tip: Point, from: Point, head: PlacedMessage["head"]): ReactNode {
  const dx = Math.sign(tip.x - from.x);
  const size = 7;
  switch (head) {
    case "arrow":
      return (
        <polygon
          className="head"
          points={`${tip.x},${tip.y} ${tip.x - dx * size},${tip.y - size * 0.65} ${tip.x - dx * size},${tip.y + size * 0.65}`}
        />
      );
    case "open":
      return (
        <path
          className="line"
          d={`M${tip.x - dx * size} ${tip.y - size * 0.7} L${tip.x} ${tip.y} L${tip.x - dx * size} ${tip.y + size * 0.7}`}
        />
      );
    case "cross":
      return (
        <path
          className="line"
          d={`M${tip.x - 8 * dx - 4} ${tip.y - 4} l8 8 M${tip.x - 8 * dx - 4} ${tip.y + 4} l8 -8`}
        />
      );
    case "none":
      return null;
  }
}

function Message({ message }: { message: PlacedMessage }) {
  const first = message.points[0]!;
  const second = message.points[1]!;
  const tip = message.points.at(-1)!;
  const beforeTip = message.points.at(-2)!;
  return (
    <g className={`edge${message.dashed ? " dashed" : ""}`}>
      <path className="line" d={pathOf(message.points)} />
      {headAt(tip, beforeTip, message.head)}
      {message.both ? headAt(first, second, message.head) : null}
      {message.number === undefined ? null : (
        <g className="step-number">
          <circle cx={first.x} cy={first.y} r="9" />
          <text x={first.x} y={first.y}>
            {message.number}
          </text>
        </g>
      )}
      {message.labelBox === undefined ? null : (
        <g className="edge-label">
          <rect
            x={message.labelBox.x}
            y={message.labelBox.y}
            width={message.labelBox.w}
            height={message.labelBox.h}
            rx="9"
          />
          <Lines
            x={message.labelBox.x + message.labelBox.w / 2}
            y={message.labelBox.y + message.labelBox.h / 2}
            lines={message.text}
          />
        </g>
      )}
    </g>
  );
}

function Actor({ actor }: { actor: PlacedActor }) {
  return (
    <foreignObject x={actor.x} y={actor.y} width={actor.w} height={actor.h}>
      <div className="card" style={{ height: actor.h }}>
        <span className="chip">
          <Icon name={actor.icon} />
        </span>
        <span className="texts">
          {actor.label.map((line, index) => (
            <strong key={index}>{line}</strong>
          ))}
        </span>
      </div>
    </foreignObject>
  );
}

function BlockFrame({ block }: { block: PlacedBlock }) {
  if (block.block === "rect") {
    return (
      <rect className="seq-rect" x={block.x} y={block.y} width={block.w} height={block.h} rx="10" />
    );
  }
  return (
    <g>
      <rect
        className="seq-frame"
        x={block.x}
        y={block.y}
        width={block.w}
        height={block.h}
        rx="10"
      />
      {block.sections.map((section) => (
        <path
          key={section.y}
          className="seq-divider"
          d={`M${block.x} ${section.y} H${block.x + block.w}`}
        />
      ))}
    </g>
  );
}

function Pill({ x, y, width, text }: { x: number; y: number; width: number; text: string }) {
  return (
    <g className="edge-label">
      <rect x={x} y={y - 9} width={width} height={18} rx="9" />
      <text x={x + width / 2} y={y}>
        {text}
      </text>
    </g>
  );
}

/** The tags draw after the lifelines and bars, so nothing crosses their text. */
function BlockTags({ block }: { block: PlacedBlock }) {
  if (block.block === "rect") {
    return null;
  }
  const kind = block.block.toUpperCase();
  const kindWidth = kind.length * 7 + 14;
  return (
    <g>
      <g className="seq-tag">
        <rect x={block.x + 10} y={block.y - 8} width={kindWidth} height={16} rx="8" />
        <text x={block.x + 10 + kindWidth / 2} y={block.y}>
          {kind}
        </text>
      </g>
      {block.text === "" ? null : (
        <Pill x={block.x + 16 + kindWidth} y={block.y} width={block.textWidth} text={block.text} />
      )}
      {block.sections.map((section) =>
        section.text === "" ? null : (
          <Pill
            key={section.y}
            x={block.x + 10}
            y={section.y}
            width={section.width}
            text={section.text}
          />
        ),
      )}
    </g>
  );
}

export function SequenceDrawing({ layout }: { layout: SequenceLayout }) {
  return (
    <svg className="sequence" width={layout.width} height={layout.height}>
      {layout.boxes.map((box) => (
        <g key={box.x}>
          <rect className="lane" x={box.x} y={box.y} width={box.w} height={box.h} rx="12" />
          <text className="lane-label" x={box.x + 14} y={box.y + 20}>
            {box.label}
          </text>
        </g>
      ))}
      {layout.blocks
        .filter((block) => block.block === "rect")
        .map((block) => (
          <BlockFrame key={block.y} block={block} />
        ))}
      {layout.blocks
        .filter((block) => block.block !== "rect")
        .map((block) => (
          <BlockFrame key={block.y} block={block} />
        ))}
      {layout.actors.map((actor) => (
        <g key={actor.key}>
          <path
            className="lifeline"
            d={`M${actor.x + actor.w / 2} ${actor.lineTop} V${actor.lineBottom}`}
          />
          {actor.destroyed ? (
            <path
              className="lifeline-end"
              d={`M${actor.x + actor.w / 2 - 6} ${actor.lineBottom - 6} l12 12 M${actor.x + actor.w / 2 - 6} ${actor.lineBottom + 6} l12 -12`}
            />
          ) : null}
        </g>
      ))}
      {layout.activations.map((bar) => (
        <rect
          key={`${bar.x}:${bar.y}`}
          className="activation"
          x={bar.x}
          y={bar.y}
          width={bar.w}
          height={bar.h}
          rx="3"
        />
      ))}
      {layout.messages.map((message, index) => (
        <Message key={index} message={message} />
      ))}
      {layout.notes.map((note, index) => (
        <g key={index} className="seq-note">
          <rect x={note.x} y={note.y} width={note.w} height={note.h} rx="8" />
          <Lines x={note.x + note.w / 2} y={note.y + note.h / 2} lines={note.text} step={18} />
        </g>
      ))}
      {layout.blocks.map((block) => (
        <BlockTags key={block.y} block={block} />
      ))}
      {layout.actors.map((actor) => (
        <Actor key={actor.key} actor={actor} />
      ))}
    </svg>
  );
}
