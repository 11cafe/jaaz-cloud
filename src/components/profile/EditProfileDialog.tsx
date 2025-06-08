// import { UserInDB } from "@/server/dbTypes";
// import { useSession } from "next-auth/react";
// import { useRef, useState } from "react";

// export default function EditProfileDialog({
//   onClose,
//   user,
// }: {
//   onClose: () => void;
//   user: UserInDB;
// }) {
//   const ref = useRef<HTMLFormElement>(null);
//   const [updating, setUpdating] = useState(false);
//   const { data: session, update } = useSession();
//   const [error, setError] = useState<string | null>(null);
//   const handleSave = async () => {
//     const form = ref.current;
//     if (!form) return;
//     setUpdating(true);
//     const formData = new FormData(form);
//     const username = formData.get("username") as string;
//     const intro = formData.get("intro") as string;
//     try {
//       if (!session) {
//         alert("Please login first");
//         setUpdating(false);
//         return;
//       }
//       if (!username.length) {
//         setError("Username cannot be empty");
//         setUpdating(false);
//         return;
//       }
//       setError(null);
//       const newProfile = await fetch("/api/user/update_my_profile", {
//         method: "POST",
//         body: JSON.stringify({ username, intro }),
//         headers: {
//           "Content-Type": "application/json",
//         },
//       }).then((res) => res.json());
//       if (newProfile.error) {
//         setError(newProfile.error);
//         setUpdating(false);
//         return;
//       }

//       if (newProfile.data?.username) {
//         await update({
//           username: newProfile.data?.username,
//         });
//       }
//       window.location.href = "/profile/" + username;
//     } catch (e) {
//       alert("Failed to update profile");
//       console.error(e);
//       setUpdating(false);
//     }
//   };

//   return (
//     <Modal size={"xl"} isOpen onClose={() => onClose()}>
//       <ModalContent>
//         <ModalBody p={5}>
//           <Flex alignItems={"center"} mb={5} gap={3}>
//             <Heading size={"md"}>Edit Profile</Heading>
//           </Flex>
//           {error && <Text color={"red.500"}>{error}</Text>}
//           <form ref={ref}>
//             <Stack gap={4} mb={6}>
//               <Flex alignItems={"center"}>
//                 <Text flex={1}>Username</Text>
//                 <Input flex={2} name="username" defaultValue={user.username} />
//               </Flex>
//               <Flex alignItems={"center"}>
//                 <Text flex={1}>Intro</Text>
//                 <Textarea
//                   flex={2}
//                   name="intro"
//                   defaultValue={user.intro ?? ""}
//                 />
//               </Flex>
//             </Stack>
//           </form>
//           <Button onClick={handleSave} colorScheme="teal" isLoading={updating}>
//             Save
//           </Button>
//         </ModalBody>
//       </ModalContent>
//     </Modal>
//   );
// }
