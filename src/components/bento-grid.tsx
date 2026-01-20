"use client";

import { cn } from "@/lib/utils";
import { ReactNode, forwardRef, CSSProperties } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { GripVertical } from "lucide-react";

// Tile configuration type
export interface TileConfig {
    id: string;
    colSpan?: 1 | 2;
    rowSpan?: 1 | 2;
}

export interface BentoTileProps {
    children: ReactNode;
    className?: string;
    colSpan?: 1 | 2;
    rowSpan?: 1 | 2;
    id?: string;
    isDragging?: boolean;
}

export const BentoTile = forwardRef<HTMLDivElement, BentoTileProps>(
    ({ children, className, colSpan = 1, rowSpan = 1, isDragging }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "glass-card rounded-xl p-4 transition-all duration-300",
                    "hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5",
                    colSpan === 2 && "md:col-span-2",
                    rowSpan === 2 && "md:row-span-2",
                    isDragging && "opacity-50 scale-95",
                    className
                )}
            >
                {children}
            </div>
        );
    }
);

BentoTile.displayName = "BentoTile";

// Sortable tile wrapper
interface SortableTileProps {
    id: string;
    children: ReactNode;
    colSpan?: 1 | 2;
    rowSpan?: 1 | 2;
    index?: number;
}

function SortableTile({ id, children, colSpan = 1, rowSpan = 1, index = 0 }: SortableTileProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        gridColumn: colSpan === 2 ? "span 2" : "span 1",
        gridRow: rowSpan === 2 ? "span 2" : "span 1",
        animationDelay: `${index * 0.05}s`,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "glass-card rounded-xl p-4 relative group",
                "hover:shadow-lg hover:shadow-primary/5",
                "opacity-0 animate-fade-in",
                "transition-shadow duration-200",
                isDragging && "opacity-50 z-50 shadow-xl"
            )}
        >
            {/* Drag handle */}
            <button
                {...attributes}
                {...listeners}
                className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/50 cursor-grab active:cursor-grabbing z-10"
                aria-label="Drag to reorder"
            >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            {children}
        </div>
    );
}

// Bento Grid Props
export interface BentoGridProps {
    children: ReactNode;
    className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
    return (
        <div
            className={cn(
                "grid gap-4",
                "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
                "auto-rows-[minmax(140px,auto)]",
                className
            )}
        >
            {children}
        </div>
    );
}

// Sortable Bento Grid with drag-and-drop
interface SortableBentoGridProps {
    tiles: TileConfig[];
    renderTile: (id: string) => ReactNode;
    onReorder: (tiles: TileConfig[]) => void;
    className?: string;
}

export function SortableBentoGrid({
    tiles,
    renderTile,
    onReorder,
    className,
}: SortableBentoGridProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string);
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const oldIndex = tiles.findIndex((t) => t.id === active.id);
            const newIndex = tiles.findIndex((t) => t.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newTiles = [...tiles];
                const [removed] = newTiles.splice(oldIndex, 1);
                newTiles.splice(newIndex, 0, removed);
                onReorder(newTiles);
            }
        }
    }

    const activeTile = tiles.find((t) => t.id === activeId);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={tiles.map((t) => t.id)} strategy={rectSortingStrategy}>
                <div
                    className={cn(
                        "grid gap-4",
                        "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
                        "auto-rows-[minmax(140px,auto)]",
                        className
                    )}
                >
                    {tiles.map((tile, index) => (
                        <SortableTile
                            key={tile.id}
                            id={tile.id}
                            colSpan={tile.colSpan}
                            rowSpan={tile.rowSpan}
                            index={index}
                        >
                            {renderTile(tile.id)}
                        </SortableTile>
                    ))}
                </div>
            </SortableContext>

            {/* Drag overlay for visual feedback */}
            <DragOverlay>
                {activeId && activeTile ? (
                    <div
                        className={cn(
                            "glass-card rounded-xl p-4 shadow-2xl shadow-primary/20 opacity-90",
                            activeTile.colSpan === 2 && "w-[calc(50%-0.5rem)]",
                            activeTile.rowSpan === 2 && "min-h-[280px]"
                        )}
                        style={{
                            width: activeTile.colSpan === 2 ? "400px" : "200px",
                            minHeight: activeTile.rowSpan === 2 ? "280px" : "140px",
                        }}
                    >
                        {renderTile(activeId)}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
