confirmDelete = (event) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) {
        event.preventDefault();
    }
}

confirmPost = (event) => {
    if (!window.confirm("Add to entries?")) {
        event.preventDefault();
    }
}