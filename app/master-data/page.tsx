import { redirect } from "next/navigation";
import { MASTER_CONFIGS } from "@/lib/masterData";

const MasterDataPage = () => {
  redirect(`/master-data/${MASTER_CONFIGS[0].storeKey}`);
};

export default MasterDataPage;
