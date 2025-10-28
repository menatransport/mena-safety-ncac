"use client";

import * as React from "react";
import { CalendarIcon } from "@radix-ui/react-icons"
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

export function DateTimePicker24h (values: {
  value?: Date, 
  onChange?: (date: Date | undefined) => void,
  disabled?: boolean
}) {
  const [date, setDate] = React.useState<Date>();
  const [isOpen, setIsOpen] = React.useState(false);

  // Sync internal date with external value
  React.useEffect(() => {
    if (values.value) {
      setDate(values.value);
    }
  }, [values.value]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && !values.disabled) {
      setDate(selectedDate);
      values.onChange?.(selectedDate);
    }
  };

  const handleTimeChange = (
    type: "hour" | "minute",
    value: string
  ) => {
    if (date && !values.disabled) {
      const newDate = new Date(date);
      if (type === "hour") {
        newDate.setHours(parseInt(value));
      } else if (type === "minute") {
        newDate.setMinutes(parseInt(value));
      }
      setDate(newDate);
     values.onChange?.(newDate);
    }
  };

  return (
    <Popover open={isOpen && !values.disabled} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          style={{ opacity: 1 }}
          disabled={values.disabled}
          className={cn(
            "w-full justify-start p-2 text-left font-normal",
            !date && "text-muted-foreground",
            values.disabled && "cursor-not-allowed p-2 bg-gray-100 text-blue-600 font-bold"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "dd/MM/yyyy HH:mm")
          ) : (
            <span></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="sm:flex">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
          />
          <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
            <ScrollArea className="w-64 sm:w-auto">
              <div className="p-2">
                <span className="text-sm font-medium text-gray-600 mb-2 block text-center">ชั่วโมง</span>
                <div className="flex sm:flex-col">
                  {hours.map((hour) => (
                    <Button
                      key={hour}
                      size="icon"
                      variant={date && date.getHours() === hour ? "default" : "ghost"}
                      className="sm:w-full shrink-0 aspect-square"
                      onClick={() => handleTimeChange("hour", hour.toString())}
                      disabled={values.disabled}
                    >
                      {hour}
                    </Button>
                  ))}
                </div>
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
            <ScrollArea className="w-64 sm:w-auto">
              <div className="p-2">
                <span className="text-sm font-medium text-gray-600 mb-2 block text-center">นาที</span>
                <div className="flex sm:flex-col">
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                    <Button
                      key={minute}
                      size="icon"
                      variant={date && date.getMinutes() === minute ? "default" : "ghost"}
                      className="sm:w-full shrink-0 aspect-square"
                      onClick={() => handleTimeChange("minute", minute.toString())}
                      disabled={values.disabled}
                    >
                      {minute.toString().padStart(2, '0')}
                    </Button>
                  ))}
                </div>
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}