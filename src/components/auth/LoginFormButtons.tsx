import { Button } from "@/components/ui/button";
import { IconBrandGoogleFilled } from "@tabler/icons-react";
import { motion } from "framer-motion";

export default function LoginFormButtons({
  onClickGoogle,
}: {
  onClickGoogle: () => void;
  onClickGithub?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Button
          onClick={onClickGoogle}
          className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 font-medium shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-300 group"
        >
          <div className="flex items-center justify-center gap-3">
            <IconBrandGoogleFilled size={20} className="group-hover:scale-110 transition-transform duration-200" />
            <span>使用 Google 继续</span>
          </div>
        </Button>
      </motion.div>
    </div>
  );
}
