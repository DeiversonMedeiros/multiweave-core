import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SEGMENT_LABELS: Record<string, string> = {
  gestao: "Gestão",
  rh: "RH",
  "treinamentos-online": "Treinamentos Online",
};

function getSegmentLabel(segment: string, pathSegments: string[], index: number): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (UUID_REGEX.test(segment)) {
    if (pathSegments[index - 1] === "treinamentos-online") return "Treinamento";
    return "…";
  }
  const normalized = segment.replace(/-/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  const breadcrumbItems = [
    { label: "Início", path: "/" },
    ...pathSegments.map((segment, index) => {
      const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
      const label = getSegmentLabel(segment, pathSegments, index);
      return { label, path };
    }),
  ];

  return (
    <nav className="flex items-center min-w-0 overflow-hidden text-sm text-muted-foreground">
      {breadcrumbItems.map((item, index) => (
        <div key={item.path} className="flex items-center flex-shrink-0 min-w-0 last:min-w-0 last:overflow-hidden last:flex-1">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />}
          {index === breadcrumbItems.length - 1 ? (
            <span className="font-medium text-foreground truncate block" title={item.label}>
              {item.label}
            </span>
          ) : (
            <Link
              to={item.path}
              className="hover:text-foreground transition-colors flex items-center gap-1 truncate min-w-0"
              title={item.label}
            >
              {index === 0 && <Home className="h-4 w-4 flex-shrink-0" />}
              <span className="truncate">{item.label}</span>
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
};
