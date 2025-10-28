
import { NavComponent } from "@/components/Navbar";
import { ACFormComponent } from "@/components/ACForm";
import { Suspense } from "react";

const ACFormPage = () => {
  return (
    
      <NavComponent>
       <Suspense fallback={<div style={{ background: '#cae9cd' }}></div>}><ACFormComponent /></Suspense>
      </NavComponent>
    
  );
};

export default ACFormPage;