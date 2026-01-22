"use client"

// npx shadcn-ui@latest add checkbox
// npm  i react-use-measure
import { Dispatch, ReactNode, SetStateAction, useState } from "react"
import { Trash } from "lucide-react"
import {
  AnimatePresence,
  LayoutGroup,
  Reorder,
  motion,
  useDragControls,
} from "motion/react"
import useMeasure from "react-use-measure"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"

export type Item = {
  text: string
  checked: boolean
  id: string | number
  description: string
}

interface SortableListItemProps {
  item: Item
  order: number
  onCompleteItem: (id: string | number) => void
  onRemoveItem: (id: string | number) => void
  renderExtra?: (item: Item) => React.ReactNode
  isExpanded?: boolean
  className?: string
  handleDrag: () => void
}

function SortableListItem({
  item,
  order,
  onCompleteItem,
  onRemoveItem,
  renderExtra,
  handleDrag,
  isExpanded,
  className,
}: SortableListItemProps) {
  let [ref, bounds] = useMeasure()
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggable, setIsDraggable] = useState(true)
  const dragControls = useDragControls()

  const handleDragStart = (event: any) => {
    setIsDragging(true)
    dragControls.start(event, { snapToCursor: true })
    handleDrag()
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  return (
    <motion.div className={cn("", className)} key={item.id}>
      <div className="flex w-full items-center">
        <Reorder.Item
          value={item}
          className={cn(
            "relative z-auto grow",
            "h-full",
            item.checked ? "cursor-not-allowed" : "cursor-grab",
            item.checked && !isDragging ? "w-7/10" : "w-full"
          )}
          key={item.id}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            height: bounds.height > 0 ? bounds.height : undefined,
            transition: {
              type: "spring",
              bounce: 0,
              duration: 0.4,
            },
          }}
          exit={{
            opacity: 0,
            transition: {
              duration: 0.05,
              type: "spring",
              bounce: 0.1,
            },
          }}
          layout
          layoutId={`item-${item.id}`}
          dragListener={!item.checked}
          dragControls={dragControls}
          onDragEnd={handleDragEnd}
          style={
            isExpanded
              ? {
                  zIndex: 9999,
                  marginTop: 10,
                  marginBottom: 10,
                  position: "relative",
                  overflow: "hidden",
                }
              : {
                  position: "relative",
                  overflow: "hidden",
                }
          }
          whileDrag={{ zIndex: 9999 }}
        >
          <div ref={ref} className={cn(isExpanded ? "" : "", "z-20 ")}>
            <motion.div
              layout="position"
              className="flex items-center justify-center "
            >
              <AnimatePresence>
                {!isExpanded ? (
                  <motion.div
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(4px)" }}
                    transition={{ duration: 0.001 }}
                    className="flex  items-center space-x-2 "
                  >
                    {/* Only show checkbox and default content if no renderExtra */}
                    {!renderExtra && (
                      <>
                        <Checkbox
                          checked={item.checked}
                          id={`checkbox-${item.id}`}
                          aria-label="Mark to delete"
                          onCheckedChange={() => onCompleteItem(item.id)}
                          className="ml-3 h-5 w-5 rounded-md"
                        />
                        <p className="font-mono text-xs pl-1 text-muted-foreground">
                          {order + 1}
                        </p>
                        <motion.div
                          key={`${item.checked}`}
                          className="px-1 min-w-[150px]"
                          initial={{
                            opacity: 0,
                            filter: "blur(4px)",
                          }}
                          animate={{ opacity: 1, filter: "blur(0px)" }}
                          transition={{
                            bounce: 0.2,
                            delay: item.checked ? 0.2 : 0,
                            type: "spring",
                          }}
                        >
                          <h4
                            className={cn(
                              "tracking-tighter text-base md:text-lg",
                              item.checked ? "text-destructive" : "text-foreground"
                            )}
                          >
                            {item.checked ? "Delete" : ` ${item.text}`}
                          </h4>
                        </motion.div>
                      </>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* List Item Children */}
              {renderExtra && renderExtra(item)}
            </motion.div>
          </div>
          <div
            onPointerDown={isDraggable ? handleDragStart : undefined}
            style={{ touchAction: "none" }}
          />
        </Reorder.Item>
        {/* List Delete Action Animation */}
        <AnimatePresence mode="popLayout">
          {item.checked ? (
            <motion.div
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{
                opacity: 1,
                x: 0,
                transition: {
                  delay: 0.17,
                  duration: 0.17,
                  type: "spring",
                  bounce: 0.6,
                },
                zIndex: 5,
              }}
              exit={{
                opacity: 0,
                x: -5,
                transition: {
                  delay: 0,
                  duration: 0.0,
                  type: "spring",
                  bounce: 0,
                },
              }}
              className="-ml-[1px] h-[1.5rem] w-3 rounded-l-none rounded-r-none border-y border-y-border/50 border-r-border/50 bg-background"
            />
          ) : null}
        </AnimatePresence>
        <AnimatePresence mode="popLayout">
          {item.checked ? (
            <motion.div
              layout
              initial={{ opacity: 0, x: -5, filter: "blur(4px)" }}
              animate={{
                opacity: 1,
                x: 0,
                filter: "blur(0px)",
                transition: {
                  delay: 0.3,
                  duration: 0.15,
                  type: "spring",
                  bounce: 0.9,
                },
              }}
              exit={{
                opacity: 0,
                filter: "blur(4px)",
                x: -10,
                transition: { delay: 0, duration: 0.12 },
              }}
              className="inset-0 z-0 border-spacing-1 rounded-r-xl rounded-l-sm border-r-2 border-r-destructive/60 bg-card shadow-sm"
            >
              <button
                className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium  transition-colors duration-150   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                onClick={() => onRemoveItem(item.id)}
              >
                <Trash className="h-4 w-4 text-destructive transition-colors duration-150 fill-destructive/60" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

SortableListItem.displayName = "SortableListItem"

interface SortableListProps {
  items: Item[]
  setItems: Dispatch<SetStateAction<Item[]>> | ((items: Item[] | ((prev: Item[]) => Item[])) => void)
  onCompleteItem: (id: string | number) => void
  renderItem: (
    item: Item,
    order: number,
    onCompleteItem: (id: string | number) => void,
    onRemoveItem: (id: string | number) => void
  ) => ReactNode
}

function SortableList({
  items,
  setItems,
  onCompleteItem,
  renderItem,
}: SortableListProps) {
  if (items) {
    return (
      <LayoutGroup>
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={setItems}
          className="flex flex-col"
        >
          <AnimatePresence>
            {items?.map((item, index) =>
              renderItem(item, index, onCompleteItem, (id: string | number) =>
                setItems((items) => items.filter((item) => item.id !== id))
              )
            )}
          </AnimatePresence>
        </Reorder.Group>
      </LayoutGroup>
    )
  }
  return null
}

SortableList.displayName = "SortableList"

export { SortableList, SortableListItem }
export default SortableList
