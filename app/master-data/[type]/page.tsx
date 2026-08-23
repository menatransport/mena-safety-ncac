import { NavComponent } from "@/components/Navbar";
import { MasterDataComponent } from "@/components/MasterData";

const MasterDataTypePage = async ({ params }: { params: Promise<{ type: string }> }) => {
  const { type } = await params;

  return (
    <NavComponent>
      <MasterDataComponent type={type} />
    </NavComponent>
  );
};

export default MasterDataTypePage;
