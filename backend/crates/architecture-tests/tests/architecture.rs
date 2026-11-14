use std::{fmt, path::PathBuf};

use rust_arkitect::{
    dsl::{architectural_rules::ArchitecturalRules, arkitect::Arkitect, project::Project},
    rule::Rule,
    rust_file::RustFile,
};

// Scope the library's recursive workspace scan to production sources. Integration
// tests may compose application services with infrastructure implementations.
struct ProductionRule {
    source_root: PathBuf,
    rule: Box<dyn Rule>,
}

impl fmt::Display for ProductionRule {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.rule.fmt(formatter)
    }
}

impl Rule for ProductionRule {
    fn apply(&self, file: &RustFile) -> Result<(), String> {
        self.rule.apply(file)
    }

    fn is_applicable(&self, file: &RustFile) -> bool {
        std::path::Path::new(&file.path).starts_with(&self.source_root)
            && self.rule.is_applicable(file)
    }
}

fn layer_rules() -> Vec<Box<dyn Rule>> {
    // Subjects use Cargo package names; imported paths use Rust crate names.
    ArchitecturalRules::define()
        .rules_for_crate("lemno-domain")
        .it_must_not_depend_on(&[
            "lemno_application",
            "lemno_infrastructure",
            "lemno_mcp",
            "lemno_lib",
        ])
        .rules_for_crate("lemno-application")
        .it_must_not_depend_on(&["lemno_infrastructure", "lemno_mcp", "lemno_lib"])
        .rules_for_crate("lemno-infrastructure")
        .it_must_not_depend_on(&["lemno_application", "lemno_mcp", "lemno_lib"])
        .build()
}

#[test]
fn production_layers_respect_dependency_boundaries() {
    let workspace = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf();
    let rules = layer_rules()
        .into_iter()
        .zip(["domain", "application", "infrastructure"])
        .map(|(rule, layer)| {
            Box::new(ProductionRule {
                source_root: workspace.join("crates").join(layer).join("src"),
                rule,
            }) as Box<dyn Rule>
        })
        .collect();

    let result =
        Arkitect::ensure_that(Project::from_path(workspace.to_str().unwrap())).complies_with(rules);
    assert!(result.is_ok(), "Architecture violations: {result:#?}");
}

#[test]
fn rules_reject_forbidden_imports_and_allow_domain_and_external_dependencies() {
    for (rule, layer) in layer_rules()
        .into_iter()
        .zip(["domain", "application", "infrastructure"])
    {
        let logical_path = format!("lemno-{layer}::conversation");
        for dependency in [
            "lemno_application",
            "lemno_infrastructure",
            "lemno_mcp",
            "lemno_lib",
        ] {
            let file = RustFile::from_content(
                "conversation.rs",
                &logical_path,
                &format!("use {dependency}::Service;"),
            );
            assert!(rule.is_applicable(&file), "Unmatched layer: {layer}");
            if dependency != format!("lemno_{layer}") {
                assert!(rule.apply(&file).is_err(), "{layer} accepted {dependency}");
            }
        }
        let file = RustFile::from_content(
            "conversation.rs",
            &logical_path,
            "use lemno_domain::Error; use serde::Serialize; use std::path::Path;",
        );
        assert!(rule.apply(&file).is_ok(), "Allowed dependencies rejected");
    }
}
