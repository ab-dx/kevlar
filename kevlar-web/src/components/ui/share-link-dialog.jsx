"use client"

import { useState } from "react"
import { Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TIME_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 24, label: "24 hours (1 day)" },
  { value: 168, label: "7 days" },
  { value: 720, label: "30 days" },
]

export function ShareLinkDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  trigger,
}) {
  const [expiresInHours, setExpiresInHours] = useState(1)

  const handleConfirm = () => {
    onConfirm(expiresInHours)
    setExpiresInHours(1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Link</DialogTitle>
          <DialogDescription>
            Set an expiration time for this shared link.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="expiration" className="mb-2 block">
            Link expires in
          </Label>
          <Select
            value={expiresInHours.toString()}
            onValueChange={(value) => setExpiresInHours(Number(value))}
          >
            <SelectTrigger id="expiration" className="w-full">
              <SelectValue placeholder="Select expiration time" />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
