interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onSearch: () => void;
}

const SearchBar = ({
  searchTerm,
  setSearchTerm,
  onSearch,
}: SearchBarProps) => {
  return (
    <div className="search-container">
      <input
        type="text"
        placeholder="Search titles, actors, genres"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSearch();
          }
        }}
      />

      <button onClick={onSearch} aria-label="Search">
        <span>Search</span>
      </button>
    </div>
  );
};

export default SearchBar;
