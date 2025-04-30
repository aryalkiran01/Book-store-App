import { useDeleteBookMutation } from "../../api/book/query";
import { errorToast, successToast } from "../toaster";
import { MdDelete } from "react-icons/md";

export function DeleteBooks({ bookId }: { bookId: string }) {
  const deleteBookMutation = useDeleteBookMutation();

  const deleteBook = async () => {

    try {
      await deleteBookMutation.mutateAsync(
        {
          bookId: bookId,
        },
        {
          onSuccess(data) {
            successToast(data.message);
          },
          onError(error) {
            console.error("error", error);
            errorToast(error.message);
          },
        }
      );
    } catch (error) {
      console.error("error", error);
      errorToast("Something went wrong");
    }
  };
  return (
    <>
<button
  onClick={deleteBook}
  className="p-2 rounded-lg bg-gray-100 hover:bg-red-500 hover:text-white transition duration-300 ml-2"
>
  <MdDelete className="text-black hover:text-white" size={20} />
</button>
    </>
  );
}