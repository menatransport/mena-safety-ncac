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
  usedFor?: "date" | "datetime",
  onChange?: (date: Date | undefined) => void,
  disabled?: boolean
}) {
  const [date, setDate] = React.useState<Date>();
  const [isOpen, setIsOpen] = React.useState(false);
  const [dateOnly, setDateOnly] = React.useState(values.usedFor === "date");

  React.useEffect(() => {
    if (values.value) {
      setDate(values.value);
    }
  }, [values.value]);

  React.useEffect(() => {
    setDateOnly(values.usedFor === "date");
  }, [values.usedFor]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && !values.disabled) {
      const newDate = new Date(selectedDate);
      if (dateOnly) {
        newDate.setHours(0, 0, 0, 0);
      } else if (date) {
        newDate.setHours(date.getHours(), date.getMinutes());
      }
      setDate(newDate);
      values.onChange?.(newDate);
    }
  };

  const handleTodayClick = () => {
    if (!values.disabled) {
      const today = new Date();
      if (dateOnly) {
        today.setHours(0, 0, 0, 0);
      }
      setDate(today);
      values.onChange?.(today);
    }
  };

  const handleDateOnlyToggle = () => {
    if (!values.disabled && !values.usedFor) {
      const newDateOnly = !dateOnly;
      setDateOnly(newDateOnly);
      
      if (date && newDateOnly) {
        const newDate = new Date(date);
        newDate.setHours(0, 0, 0, 0);
        setDate(newDate);
        values.onChange?.(newDate);
      }
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
            dateOnly ? format(date, "dd/MM/yyyy") : format(date, "dd/MM/yyyy HH:mm")
          ) : (
            <span></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white border border-slate-200 shadow-xl z-[99999]" sideOffset={4}>
        <div className="sm:flex bg-white rounded-lg">
          <div className="flex flex-col bg-white">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              className="bg-white"
            />
            <div className="flex gap-2 p-3 border-t border-slate-100 bg-slate-50">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                onClick={handleTodayClick}
                disabled={values.disabled}
              >
                วันนี้
              </Button>
              {!values.usedFor && (
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={handleDateOnlyToggle}
                  disabled={values.disabled}
                >
                  {dateOnly ? "datetime" : "dateonly"}
                </Button>
              )}
            </div>
          </div>
          {!dateOnly && (
          <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x bg-white border-l border-slate-100">
            <ScrollArea className="w-64 sm:w-auto bg-white">
              <div className="p-2 bg-white">
                <span className="text-sm font-medium text-slate-700 mb-2 block text-center">ชั่วโมง</span>
                <div className="flex sm:flex-col">
                  {hours.map((hour) => (
                    <Button
                      key={hour}
                      size="icon"
                      variant={date && date.getHours() === hour ? "default" : "ghost"}
                      className={`sm:w-full shrink-0 aspect-square ${date && date.getHours() === hour ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'text-slate-700 hover:bg-slate-100'}`}
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
            <ScrollArea className="w-64 sm:w-auto bg-white">
              <div className="p-2 bg-white">
                <span className="text-sm font-medium text-slate-700 mb-2 block text-center">นาที</span>
                <div className="flex sm:flex-col">
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                    <Button
                      key={minute}
                      size="icon"
                      variant={date && date.getMinutes() === minute ? "default" : "ghost"}
                      className={`sm:w-full shrink-0 aspect-square ${date && date.getMinutes() === minute ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'text-slate-700 hover:bg-slate-100'}`}
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
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}