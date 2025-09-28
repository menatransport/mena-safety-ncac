"use client";
import { useState, useEffect } from "react";


interface ACRecord {
  // id: string;
  // date: string;
  // time: string;
  // reporter: string;
  // location: string;
  // incidentType: string;
  // severity: 'Minor' | 'Moderate' | 'Severe' | 'Critical';
  // status: 'Reported' | 'Under Investigation' | 'Resolved' | 'Closed';
  // injuredPerson?: string;
  // description: string;
}

export const ACRecordsComponent = () => {
  const [records, setRecords] = useState<ACRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  
  return (
    <div className=" min-h-screen bg-[#eef8ef] p-6">
      
    </div>
  );
};