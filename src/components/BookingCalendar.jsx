import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, User, Phone, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { db, isFirebaseConfigured, mockDb } from '../firebaseClient';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

export default function BookingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today, but skip to Monday if today is Sunday
    const today = new Date();
    if (today.getDay() === 0) {
      const monday = new Date(today);
      monday.setDate(today.getDate() + 1);
      return monday;
    }
    return today;
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Doctor consultation slots: 15-minute intervals from 3:00 PM to 4:45 PM (Mon–Sat only)
  const timeSlots = useMemo(() => [
    '03:00 PM', '03:15 PM', '03:30 PM', '03:45 PM',
    '04:00 PM', '04:15 PM', '04:30 PM', '04:45 PM'
  ], []);

  // Format date to YYYY-MM-DD
  const formatDateString = (date) => {
    const d = new Date(date);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  };

  const selectedDateStr = useMemo(() => formatDateString(selectedDate), [selectedDate]);

  // Fetch booked slots for the selected date
  useEffect(() => {
    let active = true;
    async function fetchBookings() {
      setLoadingSlots(true);
      try {
        if (isFirebaseConfigured) {
          const appointmentsRef = collection(db, 'clinic_appointments');
          const q = query(
            appointmentsRef,
            where('appointment_date', '==', selectedDateStr)
          );
          const querySnapshot = await getDocs(q);
          const booked = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.status === 'Pending' || data.status === 'Confirmed') {
              booked.push(data.time_slot);
            }
          });
          if (active) setBlockedSlots(booked);
        } else {
          const mockBookings = await mockDb.getAppointments(selectedDateStr);
          const booked = mockBookings
            .filter((apt) => apt.status === 'Pending' || apt.status === 'Confirmed')
            .map((apt) => apt.time_slot);
          if (active) setBlockedSlots(booked);
        }
      } catch (err) {
        console.error('Error fetching bookings:', err);
      } finally {
        if (active) setLoadingSlots(false);
      }
    }
    fetchBookings();
    return () => {
      active = false;
    };
  }, [selectedDateStr]);

  // Calendar logic helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    const today = new Date();
    if (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())) {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const selectDay = (day) => {
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Disable past days and Sundays
    if (date >= today && date.getDay() !== 0) {
      setSelectedDate(date);
      setSelectedTimeSlot(null);
      setError('');
    }
  };

  // Submit appointment handler
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter a valid phone number.');
      return;
    }
    if (!selectedTimeSlot) {
      setError('Please select a consultation time slot.');
      return;
    }

    setSubmitting(true);

    const payload = {
      patient_name: name.trim(),
      patient_phone: phone.trim(),
      appointment_date: selectedDateStr,
      time_slot: selectedTimeSlot,
      status: 'Pending'
    };

    try {
      if (isFirebaseConfigured) {
        await addDoc(collection(db, 'clinic_appointments'), {
          ...payload,
          created_at: new Date().toISOString()
        });
      } else {
        await mockDb.addAppointment(payload);
      }

      setSuccess(true);
      setName('');
      setPhone('');
      setSelectedTimeSlot(null);
      setBlockedSlots((prev) => [...prev, selectedTimeSlot]);
      
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('Booking submission error:', err);
      setError('Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate calendar day cells — Sundays are blocked
  const daysGrid = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = 1; d <= daysInMonth; d++) {
      const thisDate = new Date(year, month, d);
      const isPast = thisDate < today;
      const isSunday = thisDate.getDay() === 0;
      const isBlocked = isPast || isSunday;
      const isSelected = selectedDate.getDate() === d &&
                         selectedDate.getMonth() === month &&
                         selectedDate.getFullYear() === year;
      
      let dayBtnStyles = "w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-medium text-sm transition-all duration-200 ";
      if (isBlocked) {
        if (isSunday && !isPast) {
          // Sundays: distinctive "closed" styling — rose tint, strikethrough
          dayBtnStyles += "text-rose-400/50 cursor-not-allowed bg-rose-50/30 line-through opacity-50";
        } else {
          dayBtnStyles += "text-slate-300 cursor-not-allowed bg-slate-50 line-through opacity-40";
        }
      } else if (isSelected) {
        dayBtnStyles += "bg-emerald-600 text-white shadow-md hover:bg-emerald-700 ring-2 ring-emerald-300";
      } else {
        dayBtnStyles += "text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer border border-slate-100 hover:border-emerald-200";
      }

      cells.push(
        <button
          key={`day-${d}`}
          type="button"
          disabled={isBlocked}
          onClick={() => selectDay(d)}
          title={isSunday ? 'Closed on Sundays' : undefined}
          className={dayBtnStyles}
        >
          {d}
        </button>
      );
    }
    return cells;
  }, [year, month, selectedDate, firstDayIndex, daysInMonth]);

  return (
    <div className="glassmorphism-light rounded-2xl p-6 md:p-8 max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
      {/* Visual neon light bar on card top */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-neon"></div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-900 mt-2">
        {/* Left Side: Calendar */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Select Date
                <span className="ml-2 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Mon – Sat Only</span>
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={year === new Date().getFullYear() && month === new Date().getMonth()}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-sm text-slate-800 min-w-[100px] text-center">
                  {monthNames[month]} {year}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="border border-slate-100 rounded-xl p-3 bg-white">
              <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-400 mb-2 py-1 uppercase tracking-wider">
                <div className="text-rose-400">Su</div>
                <div>Mo</div>
                <div>Tu</div>
                <div>We</div>
                <div>Th</div>
                <div>Fr</div>
                <div>Sa</div>
              </div>
              <div className="grid grid-cols-7 gap-1.5 justify-items-center">
                {daysGrid}
              </div>
            </div>

            {/* Sunday closed legend */}
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span className="w-3 h-3 rounded bg-rose-100 border border-rose-200 inline-block"></span>
              <span>Sundays are closed — no appointments available</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
            <p className="text-xs text-emerald-800 leading-relaxed font-medium">
              Selected: <span className="font-bold underline text-emerald-950">{selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>. Consultation slots refresh in real-time.
            </p>
          </div>
        </div>

        {/* Right Side: Available Slots & Form */}
        <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-200/70 pt-6 lg:pt-0 lg:pl-8">
          <div>
            <h3 className="font-semibold text-lg text-slate-800 flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-cyan-600" />
              Consultation Slots
            </h3>
            <p className="text-xs text-slate-500 mb-4">Doctor available 3:00 PM – 5:00 PM (15-min slots)</p>

            {loadingSlots ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <span className="text-xs font-medium">Refreshing active slots...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((slot) => {
                  const isBooked = blockedSlots.includes(slot);
                  const isSelected = selectedTimeSlot === slot;

                  let slotStyles = "py-2 px-3 text-center rounded-lg text-xs font-semibold tracking-wide border transition-all duration-200 ";
                  if (isBooked) {
                    slotStyles += "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through";
                  } else if (isSelected) {
                    slotStyles += "bg-cyan-600 text-white border-cyan-700 shadow-md ring-2 ring-cyan-200";
                  } else {
                    slotStyles += "bg-white text-slate-700 border-slate-200 hover:border-cyan-400 hover:text-cyan-700 cursor-pointer";
                  }

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isBooked}
                      onClick={() => {
                        setSelectedTimeSlot(slot);
                        setError('');
                      }}
                      className={slotStyles}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Fields */}
          <form onSubmit={handleBookingSubmit} className="space-y-4 mt-6">
            <div>
              <label htmlFor="patient-name" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  id="patient-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. Ramesh Kumar"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="patient-phone" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  id="patient-phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. 94313 60455"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Notifications */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium rounded-xl flex items-center gap-2 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Appointment booked successfully! We will confirm via phone.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Securing slot...
                </>
              ) : (
                'Confirm Appointment'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
