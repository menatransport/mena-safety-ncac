
import { NavComponent } from "@/components/Navbar";
import { NCFormComponent } from "@/components/NCForm";
import { Suspense } from "react";


const NCFormPage = () => {

  return (
    <>
     
        <NavComponent>
           <Suspense fallback={<div style={{ background: '#cae9cd' }}></div>}><NCFormComponent /></Suspense>
        </NavComponent>
     
    </>
  );
};

export default NCFormPage;