confirmDelete = (event) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) {
        event.preventDefault();
    }
}