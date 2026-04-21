"use client";

import * as React from "react";
import { CalendarIcon, ClockIcon } from "@radix-ui/react-icons"
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DateTimePicker24h(values: {
  value?: Date,
  usedFor?: "date" | "datetime",
  onChange?: (date: Date | undefined) => void,
  disabled?: boolean,
  variant?: "light" | "dark"
}) {
  const [date, setDate] = React.useState<Date>();
  const [isOpen, setIsOpen] = React.useState(false);
  const [dateOnly, setDateOnly] = React.useState(values.usedFor === "date");
  const [timeView, setTimeView] = React.useState<"hour" | "minute">("hour");

  React.useEffect(() => {
    if (values.value) {
      setDate(values.value);
    }
  }, [values.value]);

  React.useEffect(() => {
    setDateOnly(values.usedFor === "date");
  }, [values.usedFor]);

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

  const handleNowClick = () => {
    if (!values.disabled) {
      const now = new Date();
      setDate(now);
      values.onChange?.(now);
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
    if (!values.disabled) {
      const newDate = date ? new Date(date) : new Date();
      if (!date) {
        newDate.setMinutes(0, 0, 0);
      }
      if (type === "hour") {
        newDate.setHours(parseInt(value));
        setTimeView("minute");
      } else if (type === "minute") {
        newDate.setMinutes(parseInt(value));
      }
      setDate(newDate);
      values.onChange?.(newDate);
    }
  };

  const currentHour = date?.getHours() ?? -1;
  const currentMinute = date?.getMinutes() ?? -1;
  const isDark = values.variant === "dark";

  return (
    <Popover open={isOpen && !values.disabled} onOpenChange={(open) => { setIsOpen(open); if (open) setTimeView("hour"); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          style={{ opacity: 1 }}
          disabled={values.disabled}
          className={cn(
            "w-full justify-start h-11 px-3 text-left text-base font-normal rounded-xl shadow-none",
            isDark
              ? "bg-white/5 backdrop-blur-sm border-white/15 text-white hover:bg-white/10 hover:border-teal-400/40"
              : "border-stone-200 text-stone-700 hover:bg-stone-50",
            !date && (isDark ? "text-white/40" : "text-stone-400"),
            values.disabled && (isDark
              ? "!cursor-not-allowed !text-teal-200 !font-bold !bg-white/5 !border-white/10"
              : "cursor-not-allowed text-base font-bold text-blue-600 p-2 bg-gray-100 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#cfe5d0] focus:outline-none")
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
      <PopoverContent className="w-auto p-0 bg-white border border-stone-100 shadow-lg rounded-xl z-[99999]" sideOffset={4}>
        <div className="bg-white rounded-xl">
          {/* Calendar */}
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            className="bg-white"
          />

          {/* Time picker grid */}
          {!dateOnly && (
            <div className="border-t border-stone-100">
              {/* Time display + tab switcher */}
              <div className="flex items-center justify-center gap-1 px-3 pt-3 pb-2">
                <ClockIcon className="h-4 w-4 text-stone-400 mr-1.5" />
                <button
                  type="button"
                  onClick={() => setTimeView("hour")}
                  className={cn(
                    "text-2xl font-semibold tabular-nums min-w-[2.5rem] text-center rounded-lg px-2 py-0.5 transition-colors",
                    timeView === "hour" ? "bg-stone-800 text-white" : "text-stone-700 hover:bg-stone-100"
                  )}
                >
                  {currentHour >= 0 ? String(currentHour).padStart(2, "0") : "--"}
                </button>
                <span className="text-2xl font-semibold text-stone-400">:</span>
                <button
                  type="button"
                  onClick={() => setTimeView("minute")}
                  className={cn(
                    "text-2xl font-semibold tabular-nums min-w-[2.5rem] text-center rounded-lg px-2 py-0.5 transition-colors",
                    timeView === "minute" ? "bg-stone-800 text-white" : "text-stone-700 hover:bg-stone-100"
                  )}
                >
                  {currentMinute >= 0 ? String(currentMinute).padStart(2, "0") : "--"}
                </button>
              </div>

              {/* Grid: hours 6x4 or minutes 4x3 */}
              <div className="px-3 pb-2">
                {timeView === "hour" ? (
                  <div className="grid grid-cols-6 gap-1">
                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => handleTimeChange("hour", hour.toString())}
                        disabled={values.disabled}
                        className={cn(
                          "h-9 rounded-lg text-sm font-medium transition-all active:scale-95",
                          currentHour === hour
                            ? "bg-stone-800 text-white shadow-sm"
                            : "text-stone-600 hover:bg-stone-100"
                        )}
                      >
                        {String(hour).padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1">
                    {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                      <button
                        key={minute}
                        type="button"
                        onClick={() => handleTimeChange("minute", minute.toString())}
                        disabled={values.disabled}
                        className={cn(
                          "h-10 rounded-lg text-sm font-medium transition-all active:scale-95",
                          currentMinute === minute
                            ? "bg-stone-800 text-white shadow-sm"
                            : "text-stone-600 hover:bg-stone-100"
                        )}
                      >
                        {String(minute).padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex gap-2 p-3 border-t border-stone-100 bg-stone-50/50 rounded-b-xl">
            {dateOnly && <Button
              size="sm"
              variant="outline"
              className="flex-1 bg-white hover:bg-stone-50 text-stone-600 border-stone-200 shadow-none"
              onClick={handleTodayClick}
              disabled={values.disabled}
            >
              วันนี้
            </Button>
            }
            {!dateOnly && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 bg-white hover:bg-stone-50 text-stone-600 border-stone-200 shadow-none"
                onClick={handleNowClick}
                disabled={values.disabled}
              >
                ตอนนี้
              </Button>
            )}
            {!values.usedFor && (
              <Button
                size="sm"
                variant="default"
                className="flex-1 bg-stone-800 hover:bg-stone-700 text-white shadow-none"
                onClick={handleDateOnlyToggle}
                disabled={values.disabled}
              >
                {dateOnly ? "datetime" : "dateonly"}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}